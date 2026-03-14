"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  History, 
  User, 
  Receipt,
  FileText,
  Loader2,
  MessageCircle,
  Plus,
  Trash2,
  CalendarDays,
  UserCircle
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc } from "@/firebase"
import { collection, doc, serverTimestamp, getDoc, query, where, getDocs, limit, orderBy } from "firebase/firestore"
import { numberToWords } from "@/lib/number-to-words"
import { smartParentCommunicationsDrafting } from "@/ai/flows/smart-parent-communications-drafting"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface PaymentItem {
  id: string;
  type: 'fee' | 'custom';
  feeId?: string;
  name: string;
  amount: number;
  month?: string;
}

export default function PagosPage() {
  const { firestore } = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState<string | null>(null)
  const [isSendingWA, setIsSendingWA] = React.useState<string | null>(null)
  
  const pdfTemplateRef = React.useRef<HTMLDivElement>(null)
  const [pdfData, setPdfData] = React.useState<any>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "staff_roles", user.uid)
  }, [firestore, user])
  const { data: profile } = useDoc(profileRef)

  const schoolRef = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return doc(firestore, "schools", profile.schoolId)
  }, [firestore, profile])
  const { data: school } = useDoc(schoolRef)
  
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return query(collection(firestore, "students"), where("schoolId", "==", profile.schoolId))
  }, [firestore, profile])
  const { data: students } = useCollection(studentsQuery)

  const feeTypesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return query(collection(firestore, "fee_types"), where("schoolId", "==", profile.schoolId))
  }, [firestore, profile])
  const { data: fees } = useCollection(feeTypesQuery)

  const isStudent = profile?.role === "Alumno"

  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("")
  const [selectedStudent, setSelectedStudent] = React.useState<any | null>(null)
  const [paymentMethod, setPaymentMethod] = React.useState<string>("Efectivo")
  const [paymentDate, setPaymentDate] = React.useState<string>(new Date().toISOString().split('T')[0])
  const [receivedFrom, setReceivedFrom] = React.useState<string>("")
  const [isProcessing, setIsProcessing] = React.useState(false)

  const [items, setItems] = React.useState<PaymentItem[]>([
    { id: Math.random().toString(36).substr(2, 9), type: 'fee', name: '', amount: 0 }
  ])

  const [currentUserStudentDoc, setCurrentUserStudentDoc] = React.useState<any | null>(null)

  React.useEffect(() => {
    async function findStudent() {
      if (isStudent && profile?.studentIdNumber && firestore && profile?.schoolId) {
        const q = query(
          collection(firestore, "students"), 
          where("schoolId", "==", profile.schoolId),
          where("studentIdNumber", "==", profile.studentIdNumber),
          limit(1)
        )
        const snap = await getDocs(q)
        if (!snap.empty) {
          setCurrentUserStudentDoc({ ...snap.docs[0].data(), id: snap.docs[0].id })
        }
      }
    }
    findStudent()
  }, [isStudent, profile, firestore])

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null;
    
    let studentId = null;
    if (isStudent && currentUserStudentDoc) {
       studentId = currentUserStudentDoc.id;
    } else if (!isStudent && selectedStudent) {
      studentId = selectedStudent.id;
    }

    if (!studentId) return null;
    
    return query(
      collection(firestore, "students", studentId, "payments"),
      orderBy("paymentDate", "desc")
    );
  }, [firestore, selectedStudent, isStudent, profile, currentUserStudentDoc])
  
  const { data: payments, isLoading: isLoadingPayments } = useCollection(paymentsQuery)

  const handleSearchStudent = () => {
    const student = students?.find(s => s.studentIdNumber === selectedStudentId)
    if (student) {
      setSelectedStudent(student)
      setReceivedFrom(student.guardianName || "")
      toast({ title: "Alumno encontrado" })
    } else {
      toast({ variant: "destructive", title: "No encontrado" })
    }
  }

  const addItem = (type: 'fee' | 'custom') => {
    const newItem: PaymentItem = { 
      id: Math.random().toString(36).substr(2, 9), 
      type, 
      name: '', 
      amount: 0 
    };
    setItems([...items, newItem])
  }

  const removeItem = (id: string) => {
    if (items.length === 1) return
    setItems(items.filter(i => i.id !== id))
  }

  const updateItem = (id: string, updates: Partial<PaymentItem>) => {
    const newList = items.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates }
        if (updates.feeId && item.type === 'fee') {
          const fee = fees?.find(f => f.id === updates.feeId)
          if (fee) {
            updated.name = fee.name
            updated.amount = fee.baseAmount || 0
          }
        }
        return updated
      }
      return item
    });
    setItems(newList);
  }

  const handleProcessPayment = async () => {
    if (!selectedStudent || !firestore || !profile?.schoolId) return
    const total = items.reduce((sum, it) => sum + (it.amount || 0), 0)
    if (total <= 0) return

    setIsProcessing(true)
    
    try {
      const studentPaymentsRef = collection(firestore, "students", selectedStudent.id, "payments")
      const paymentData = {
        schoolId: profile.schoolId,
        studentId: selectedStudent.id,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        items: items,
        totalAmount: total,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        receivedFrom: receivedFrom,
        status: 'completado',
        createdAt: serverTimestamp(),
      }
      
      addDocumentNonBlocking(studentPaymentsRef, paymentData)

      const studentDocRef = doc(firestore, "students", selectedStudent.id)
      updateDocumentNonBlocking(studentDocRef, {
        outstandingBalance: Math.max(0, (selectedStudent.outstandingBalance || 0) - total),
        updatedAt: serverTimestamp(),
      })
      
      toast({ title: "Pago Procesado" })
      setSelectedStudent(null)
      setSelectedStudentId("")
      setItems([{ id: Math.random().toString(36).substr(2, 9), type: 'fee', name: '', amount: 0 }])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleWhatsAppNotify = async (payment: any) => {
    setIsSendingWA(payment.id)
    try {
      const studentSnap = await getDoc(doc(firestore!, "students", payment.studentId))
      const student = studentSnap.data()
      if (!student?.phone) {
        toast({ variant: "destructive", title: "Sin teléfono" })
        return
      }
      const draft = await smartParentCommunicationsDrafting({
        templateName: "avisoGeneral",
        contextData: {
          studentName: payment.studentName,
          additionalDetails: `Confirmamos el recibo de su pago por $${payment.totalAmount} MXN. Gracias.`
        }
      })
      const text = encodeURIComponent(draft.draftMessage)
      window.open(`https://wa.me/52${student.phone}?text=${text}`, '_blank')
    } catch (e) {
      toast({ variant: "destructive", title: "Error" })
    } finally {
      setIsSendingWA(null)
    }
  }

  const handleDownloadPDF = async (payment: any) => {
    if (!school || !firestore) return;
    setIsGeneratingPDF(payment.id);
    try {
      const studentSnap = await getDoc(doc(firestore, "students", payment.studentId));
      const studentData = studentSnap.exists() ? studentSnap.data() : null;
      const fullData = {
        payment,
        student: studentData,
        school,
        montoEnLetra: numberToWords(payment.totalAmount || 0),
        dateFormatted: new Date(payment.paymentDate + 'T12:00:00').toLocaleDateString()
      };
      setPdfData(fullData);
      setTimeout(async () => {
        if (pdfTemplateRef.current) {
          const canvas = await html2canvas(pdfTemplateRef.current, { scale: 2 });
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
          pdf.save(`Recibo_${payment.id.substring(0, 6)}.pdf`);
          setPdfData(null);
          setIsGeneratingPDF(null);
        }
      }, 500);
    } catch (e) { setIsGeneratingPDF(null); }
  };

  if (!mounted) return null

  const formTotal = items.reduce((sum, it) => sum + (it.amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="fixed -left-[4000px] top-0">
        <div ref={pdfTemplateRef} className="w-[210mm] p-[15mm] bg-white text-black font-serif min-h-[297mm]">
          {pdfData && (
            <div className="relative">
              <div className="flex justify-between items-start mb-2">
                <div className="w-1/3">
                  {pdfData.school.logoUrl && (
                    <img src={pdfData.school.logoUrl} className="h-24 w-auto object-contain" alt="Logo" />
                  )}
                </div>
                <div className="w-2/3 text-right">
                  <h1 className="text-[36pt] font-bold leading-none mb-4">{pdfData.school.name}</h1>
                </div>
              </div>
              <div className="text-right mb-4">
                <p className="font-bold text-lg">CCT: {pdfData.school.cct}</p>
                <p className="text-sm italic">{pdfData.school.address}</p>
              </div>
              <div className="h-1 bg-black w-full mb-6" />
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest">Recibo de Pago</h2>
                  <p className="text-xs text-muted-foreground">Folio: {pdfData.payment.id.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-sm font-bold uppercase tracking-widest">Fecha</h2>
                  <p className="text-sm">{pdfData.dateFormatted}</p>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className="border-b border-black/10 py-3 flex items-baseline">
                  <span className="text-sm font-bold uppercase w-32 shrink-0">Recibí de:</span>
                  <span className="text-base italic ml-4">{pdfData.payment.receivedFrom}</span>
                </div>
                <div className="border-b border-black/10 py-3 flex items-baseline">
                  <span className="text-sm font-bold uppercase w-32 shrink-0">Alumno:</span>
                  <span className="text-base italic ml-4">{pdfData.payment.studentName}</span>
                </div>
                <div className="border-b border-black/10 py-4 flex flex-col">
                  <span className="text-sm font-bold uppercase mb-2">Desglose de Conceptos:</span>
                  <div className="space-y-1 ml-4 pr-4">
                    {(pdfData.payment.items || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-baseline italic border-b border-dashed border-black/5 pb-1">
                        <span className="text-base">{item.name} {item.month ? `(${item.month})` : ''}</span>
                        <span className="text-base font-bold">${(item.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 p-8 rounded-xl border border-black/10 mb-12">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xl font-bold uppercase">Total Pagado:</span>
                  <span className="text-3xl font-black">${(pdfData.payment.totalAmount || 0).toLocaleString()} MXN</span>
                </div>
                <div className="text-center pt-4 border-t border-black/10 mb-4">
                  <p className="text-sm font-bold uppercase tracking-widest">{pdfData.montoEnLetra}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary">Pagos y Finanzas</h2>
          <p className="text-muted-foreground">Gestión financiera escolar inteligente.</p>
        </div>
      </div>

      <Tabs defaultValue={isStudent ? "historial" : "nuevo-pago"} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          {!isStudent && <TabsTrigger value="nuevo-pago" className="gap-2"><CreditCard className="h-4 w-4" /> Registrar Pago</TabsTrigger>}
          <TabsTrigger value="historial" className="gap-2"><History className="h-4 w-4" /> Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="nuevo-pago">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-none shadow-md lg:col-span-2">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="font-headline">Nueva Transacción</CardTitle>
                <CardDescription>Completa los detalles para generar el recibo oficial.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>ID Estudiante</Label>
                    <div className="flex gap-2">
                      <Input value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} placeholder="Matrícula..." />
                      <Button onClick={handleSearchStudent} size="icon" variant="secondary"><Search className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Alumno</Label>
                    <Input value={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : ""} disabled className="bg-muted/50" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <Label className="text-lg font-bold">Conceptos de Pago</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => addItem('fee')} className="gap-1"><Plus className="h-4 w-4" /> Catálogo</Button>
                      <Button variant="outline" size="sm" onClick={() => addItem('custom')} className="gap-1"><Plus className="h-4 w-4" /> Otro</Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-12 gap-3 items-start bg-muted/20 p-3 rounded-lg border">
                        <div className="col-span-7 space-y-2">
                          {item.type === 'fee' ? (
                            <Select value={item.feeId} onValueChange={(v) => updateItem(item.id, { feeId: v })}>
                              <SelectTrigger><SelectValue placeholder="Seleccionar tarifa..." /></SelectTrigger>
                              <SelectContent>
                                {fees?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input placeholder="Concepto personalizado" value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} />
                          )}
                        </div>
                        <div className="col-span-4 space-y-2">
                          <Input type="number" value={item.amount || ""} onChange={(e) => updateItem(item.id, { amount: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
                        </div>
                        <div className="col-span-1 pt-2">
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={items.length === 1}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="text-right">
                      <p className="text-xs uppercase opacity-50 font-bold">Total</p>
                      <p className="text-2xl font-black text-primary">${formTotal.toLocaleString()} MXN</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Método</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                        <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 border-t pt-6">
                <Button className="w-full gap-2" disabled={isProcessing || !selectedStudent} onClick={handleProcessPayment}>
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  Registrar Pago
                </Button>
              </CardFooter>
            </Card>

            {/* Sidebar: Resumen Estudiantil */}
            <div className="space-y-6">
              {selectedStudent ? (
                <>
                  <Card className="border-none shadow-lg overflow-hidden bg-primary text-primary-foreground">
                    <CardHeader className="pb-4">
                      <CardTitle className="font-headline text-2xl">Resumen Estudiantil</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 border-2 border-white/20 bg-white/10 text-white">
                          <AvatarFallback><UserCircle className="h-10 w-10" /></AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-lg leading-tight">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                          <p className="text-sm opacity-80">Grado: {selectedStudent.gradeLevel}</p>
                        </div>
                      </div>
                      
                      <div className="h-px bg-white/20" />
                      
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">SALDO TOTAL PENDIENTE</p>
                        <p className="text-4xl font-black tracking-tight">${Number(selectedStudent.outstandingBalance || 0).toLocaleString()} MXN</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-md bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-headline text-xl text-primary">Próximos Vencimientos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">Ene 20 - Mensualidad</span>
                          <Badge variant="destructive" className="rounded-full px-4 h-6 uppercase text-[9px]">Hoy</Badge>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">Feb 01 - Materiales</span>
                          <span className="text-xs font-bold text-slate-600">Faltan 11 días</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl bg-muted/10 opacity-40">
                  <User className="h-12 w-12 mb-4" />
                  <p className="text-center text-sm font-medium">Busca un estudiante para ver su resumen financiero.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="historial">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader><CardTitle className="font-headline">Historial de Transacciones</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Alumno</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingPayments ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : payments?.length ? payments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{new Date(p.paymentDate + 'T12:00:00').toLocaleDateString()}</TableCell>
                        <TableCell className="font-bold">{p.studentName}</TableCell>
                        <TableCell className="font-black text-primary">${(p.totalAmount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF(p)}>
                            {isGeneratingPDF === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                          </Button>
                          {!isStudent && (
                            <Button variant="ghost" size="icon" className="text-emerald-600" onClick={() => handleWhatsAppNotify(p)}>
                              {isSendingWA === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                          {selectedStudent || isStudent ? "No se encontraron transacciones." : "Busca un alumno para ver su historial."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

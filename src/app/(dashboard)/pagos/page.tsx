"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
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

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

export default function PagosPage() {
  const { firestore } = useFirestore()
  const { user } = useUser()
  const searchParams = useSearchParams()
  const initialStudentId = searchParams.get('studentId') || ""
  
  const [mounted, setMounted] = React.useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState<string | null>(null)
  const [isSendingWA, setIsSendingWA] = React.useState<string | null>(null)
  
  const pdfTemplateRef = React.useRef<HTMLDivElement>(null)
  const [pdfData, setPdfData] = React.useState<any>(null)

  const [selectedStudentId, setSelectedStudentId] = React.useState<string>(initialStudentId)
  const [activeStudentId, setActiveStudentId] = React.useState<string | null>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "staff_roles", user.uid)
  }, [firestore, user])
  const { data: profile } = useDoc(profileRef)

  const isStudent = profile?.role === "Alumno"

  const schoolRef = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return doc(firestore, "schools", profile.schoolId)
  }, [firestore, profile])
  const { data: school } = useDoc(schoolRef)
  
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId || isStudent) return null
    return query(collection(firestore, "students"), where("schoolId", "==", profile.schoolId))
  }, [firestore, profile, isStudent])
  const { data: students } = useCollection(studentsQuery)

  const feeTypesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return query(collection(firestore, "fee_types"), where("schoolId", "==", profile.schoolId))
  }, [firestore, profile])
  const { data: fees } = useCollection(feeTypesQuery)

  const selectedStudentRef = useMemoFirebase(() => {
    if (!firestore || !activeStudentId) return null
    return doc(firestore, "students", activeStudentId)
  }, [firestore, activeStudentId])
  const { data: activeStudent, isLoading: isLoadingActiveStudent } = useDoc(selectedStudentRef)

  const [paymentMethod, setPaymentMethod] = React.useState<string>("Efectivo")
  const [paymentDate, setPaymentDate] = React.useState<string>(new Date().toISOString().split('T')[0])
  const [receivedFrom, setReceivedFrom] = React.useState<string>("")
  const [isProcessing, setIsProcessing] = React.useState(false)

  const [items, setItems] = React.useState<PaymentItem[]>([
    { id: Math.random().toString(36).substr(2, 9), type: 'fee', name: '', amount: 0, month: MONTHS[new Date().getMonth()] }
  ])

  React.useEffect(() => {
    if (!mounted) return;

    if (isStudent && profile?.studentIdNumber && !activeStudentId) {
      handleSearchStudent(profile.studentIdNumber);
    } else if (initialStudentId && !activeStudentId) {
      handleSearchStudent(initialStudentId);
    }
  }, [mounted, isStudent, profile, initialStudentId]);

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !activeStudentId) return null;
    return query(
      collection(firestore, "students", activeStudentId, "payments"),
      orderBy("paymentDate", "desc")
    );
  }, [firestore, activeStudentId])
  
  const { data: payments, isLoading: isLoadingPayments } = useCollection(paymentsQuery)

  const handleSearchStudent = async (idToSearch?: string) => {
    const searchId = idToSearch || selectedStudentId
    if (!searchId || !firestore || !profile?.schoolId) return

    try {
      const q = query(
        collection(firestore, "students"), 
        where("schoolId", "==", profile.schoolId),
        where("studentIdNumber", "==", searchId),
        limit(1)
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        const studentDoc = snap.docs[0]
        setActiveStudentId(studentDoc.id)
        setReceivedFrom(studentDoc.data().guardianName || "")
        if (!idToSearch) toast({ title: "Alumno encontrado" })
      } else {
        setActiveStudentId(null)
        if (!idToSearch) toast({ variant: "destructive", title: "No encontrado", description: "Verifica la matrícula." })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const addItem = (type: 'fee' | 'custom') => {
    const newItem: PaymentItem = { 
      id: Math.random().toString(36).substr(2, 9), 
      type, 
      name: '', 
      amount: 0,
      month: MONTHS[new Date().getMonth()]
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
    if (!activeStudent || !firestore || !profile?.schoolId) return
    const total = items.reduce((sum, it) => sum + (it.amount || 0), 0)
    if (total <= 0) return

    setIsProcessing(true)
    
    try {
      const studentPaymentsRef = collection(firestore, "students", activeStudent.id, "payments")
      const paymentData = {
        schoolId: profile.schoolId,
        studentId: activeStudent.id,
        studentName: `${activeStudent.firstName} ${activeStudent.lastName}`,
        items: items,
        totalAmount: total,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        receivedFrom: receivedFrom,
        status: 'completado',
        createdAt: serverTimestamp(),
      }
      
      await addDocumentNonBlocking(studentPaymentsRef, paymentData)

      const studentDocRef = doc(firestore, "students", activeStudent.id)
      await updateDocumentNonBlocking(studentDocRef, {
        outstandingBalance: Math.max(0, (activeStudent.outstandingBalance || 0) - total),
        updatedAt: serverTimestamp(),
      })
      
      toast({ title: "Pago Procesado con Éxito" })
      setItems([{ id: Math.random().toString(36).substr(2, 9), type: 'fee', name: '', amount: 0, month: MONTHS[new Date().getMonth()] }])
    } catch (error) {
      toast({ variant: "destructive", title: "Error al procesar", description: "Ocurrió un problema al guardar el pago." })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleWhatsAppNotify = async (payment: any) => {
    setIsSendingWA(payment.id)
    try {
      if (!activeStudent?.phone) {
        toast({ variant: "destructive", title: "Sin teléfono", description: "El alumno no tiene un número registrado." })
        return
      }
      const draft = await smartParentCommunicationsDrafting({
        templateName: "avisoGeneral",
        contextData: {
          studentName: payment.studentName,
          additionalDetails: `Confirmamos el recibo de su pago por $${payment.totalAmount.toLocaleString()} MXN el día ${new Date(payment.paymentDate + 'T12:00:00').toLocaleDateString()}. ¡Gracias!`
        }
      })
      const text = encodeURIComponent(draft.draftMessage)
      window.open(`https://wa.me/52${activeStudent.phone}?text=${text}`, '_blank')
    } catch (e) {
      toast({ variant: "destructive", title: "Error al notificar" })
    } finally {
      setIsSendingWA(null)
    }
  }

  const handleDownloadPDF = async (payment: any) => {
    if (!school || !firestore) return;
    setIsGeneratingPDF(payment.id);
    try {
      const fullData = {
        payment,
        student: activeStudent,
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
      {/* PDF Hidden Template Restaurado */}
      <div className="fixed -left-[4000px] top-0">
        <div ref={pdfTemplateRef} className="w-[210mm] p-[15mm] bg-white text-black font-serif min-h-[297mm] relative overflow-hidden">
          {pdfData && (
            <>
              {/* Marca de agua PAGADO */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] select-none">
                <div className="text-[140px] font-black text-rose-600 border-[16px] border-rose-600 px-10 py-4 -rotate-[35deg] tracking-widest uppercase">
                  PAGADO
                </div>
              </div>

              {/* Header Principal */}
              <div className="flex justify-between items-start mb-10 relative z-10">
                <div className="w-1/3">
                  {pdfData.school.logoUrl ? (
                    <img src={pdfData.school.logoUrl} className="h-28 w-auto object-contain" alt="Logo" />
                  ) : (
                    <div className="h-20 w-20 bg-muted flex items-center justify-center rounded">LOGO</div>
                  )}
                </div>
                <div className="w-2/3 text-right">
                  <h1 className="text-[32pt] font-headline font-bold leading-tight mb-2 text-primary">{pdfData.school.name}</h1>
                  <p className="font-bold text-lg">CCT: {pdfData.school.cct}</p>
                  <p className="text-sm italic opacity-80">{pdfData.school.address}</p>
                </div>
              </div>

              <div className="h-[2px] bg-black/80 w-full mb-8" />

              {/* Folio y Fecha */}
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Recibo de Pago</h2>
                  <p className="text-xs font-mono">Folio: {pdfData.payment.id.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Fecha</h2>
                  <p className="text-base font-bold">{pdfData.dateFormatted}</p>
                </div>
              </div>

              {/* Datos del Alumno Grid */}
              <div className="grid grid-cols-1 gap-y-4 mb-10 relative z-10 border-y border-black/5 py-6">
                <div className="flex items-baseline border-b border-black/5 pb-2">
                  <span className="text-sm font-bold uppercase w-32 shrink-0">Recibí de:</span>
                  <span className="text-lg italic ml-4 flex-1">{pdfData.payment.receivedFrom}</span>
                </div>
                <div className="flex items-baseline border-b border-black/5 pb-2">
                  <span className="text-sm font-bold uppercase w-32 shrink-0">Alumno:</span>
                  <span className="text-lg italic ml-4 flex-1">{pdfData.payment.studentName}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-8">
                  <div className="flex items-baseline border-b border-black/5 pb-2">
                    <span className="text-sm font-bold uppercase w-32 shrink-0">Matrícula:</span>
                    <span className="text-lg italic ml-4">{pdfData.student?.studentIdNumber}</span>
                  </div>
                  <div className="flex items-baseline border-b border-black/5 pb-2">
                    <span className="text-sm font-bold uppercase w-24 shrink-0">Grado:</span>
                    <span className="text-lg italic ml-4">{pdfData.student?.gradeLevel}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-8">
                  <div className="flex items-baseline border-b border-black/5 pb-2">
                    <span className="text-sm font-bold uppercase w-32 shrink-0">Teléfono:</span>
                    <span className="text-lg italic ml-4">{pdfData.student?.phone}</span>
                  </div>
                  <div className="flex items-baseline border-b border-black/5 pb-2">
                    <span className="text-sm font-bold uppercase w-24 shrink-0">Método:</span>
                    <span className="text-lg italic ml-4">{pdfData.payment.paymentMethod}</span>
                  </div>
                </div>
                <div className="flex items-baseline border-b border-black/5 pb-2">
                  <span className="text-sm font-bold uppercase w-32 shrink-0">Domicilio:</span>
                  <span className="text-lg italic ml-4 flex-1 truncate">{pdfData.student?.address || "N/A"}</span>
                </div>
              </div>

              {/* Conceptos Table */}
              <div className="mb-10 relative z-10">
                <h2 className="text-sm font-bold uppercase tracking-widest mb-4">Desglose de Conceptos:</h2>
                <div className="space-y-3 px-4">
                  {(pdfData.payment.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-baseline italic border-b border-dashed border-black/10 pb-1">
                      <span className="text-lg">{item.name} {item.month ? `(${item.month})` : ''}</span>
                      <span className="text-lg font-bold">${(item.amount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Caja de Totales */}
              <div className="bg-slate-50/50 p-8 rounded-2xl border border-black/10 mb-16 relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-2xl font-bold uppercase tracking-tight text-muted-foreground">Total Pagado:</span>
                  <span className="text-[40pt] font-black text-primary tracking-tighter">${(pdfData.payment.totalAmount || 0).toLocaleString()} MXN</span>
                </div>
                <div className="text-center pt-4 border-t border-black/10 mb-6">
                  <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {pdfData.montoEnLetra}
                  </p>
                </div>
                <div className="flex justify-between items-center text-rose-600 pt-2">
                  <span className="text-xs font-bold uppercase tracking-widest">Saldo pendiente después de este pago:</span>
                  <span className="text-xl font-black">${(pdfData.student?.outstandingBalance || 0).toLocaleString()} MXN</span>
                </div>
              </div>

              {/* Footer de Firma */}
              <div className="mt-auto pt-20 text-center relative z-10">
                <div className="inline-block border-t border-black/40 px-20 pt-2">
                  {pdfData.school.adminSignatureUrl ? (
                    <img src={pdfData.school.adminSignatureUrl} className="h-20 w-auto mx-auto mb-2 opacity-90" alt="Firma" />
                  ) : (
                    <div className="h-16" />
                  )}
                  <p className="text-sm font-bold uppercase tracking-widest opacity-60">Firma Autorizada</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary">Pagos y Finanzas</h2>
          <p className="text-muted-foreground">Gestión financiera escolar inteligente para {school?.name || "tu escuela"}.</p>
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
                    <Label>ID Estudiante (Matrícula)</Label>
                    <div className="flex gap-2">
                      <Input value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} placeholder="Matrícula..." onKeyDown={(e) => e.key === 'Enter' && handleSearchStudent()} />
                      <Button onClick={() => handleSearchStudent()} size="icon" variant="secondary"><Search className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Alumno</Label>
                    <Input value={activeStudent ? `${activeStudent.firstName} ${activeStudent.lastName}` : ""} disabled className="bg-muted/50" />
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
                        <div className="col-span-5 space-y-2">
                          <Label className="text-[10px] uppercase opacity-50">Concepto</Label>
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
                        <div className="col-span-3 space-y-2">
                          <Label className="text-[10px] uppercase opacity-50">Mes</Label>
                          <Select value={item.month} onValueChange={(v) => updateItem(item.id, { month: v })}>
                            <SelectTrigger><SelectValue placeholder="Mes..." /></SelectTrigger>
                            <SelectContent>
                              {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3 space-y-2">
                          <Label className="text-[10px] uppercase opacity-50">Monto</Label>
                          <Input type="number" value={item.amount || ""} onChange={(e) => updateItem(item.id, { amount: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
                        </div>
                        <div className="col-span-1 pt-6">
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={items.length === 1}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="text-right">
                      <p className="text-xs uppercase opacity-50 font-bold">Total a Pagar</p>
                      <p className="text-2xl font-black text-primary">${formTotal.toLocaleString()} MXN</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Método de Pago</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                        <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="Depósito">Depósito Bancario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Pago</Label>
                    <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 border-t pt-6">
                <Button className="w-full gap-2" disabled={isProcessing || !activeStudent} onClick={handleProcessPayment}>
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  Finalizar Registro de Pago
                </Button>
              </CardFooter>
            </Card>

            {/* Sidebar: Resumen Estudiantil */}
            <div className="space-y-6">
              {activeStudent ? (
                <>
                  <Card className={`border-none shadow-lg overflow-hidden transition-colors ${Number(activeStudent.outstandingBalance || 0) > 0 ? 'bg-rose-600' : 'bg-emerald-600'} text-white`}>
                    <CardHeader className="pb-4">
                      <CardTitle className="font-headline text-2xl">Resumen Estudiantil</CardTitle>
                      <CardDescription className="text-white/70">Información actualizada al momento.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-white/20 bg-white/10 text-white">
                          <AvatarImage src={`https://picsum.photos/seed/${activeStudent.id}/100/100`} />
                          <AvatarFallback><UserCircle className="h-12 w-12" /></AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-xl leading-tight">{activeStudent.firstName} {activeStudent.lastName}</p>
                          <p className="text-sm opacity-90">{activeStudent.gradeLevel}</p>
                          <Badge variant="secondary" className="mt-1 bg-white/20 text-white border-none text-[10px]">
                            MAT: {activeStudent.studentIdNumber}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="h-px bg-white/20" />
                      
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">SALDO TOTAL PENDIENTE</p>
                        <p className="text-4xl font-black tracking-tight">
                          ${Number(activeStudent.outstandingBalance || 0).toLocaleString()} <span className="text-lg font-normal opacity-70">MXN</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="p-3 bg-white/10 rounded-lg">
                          <p className="text-[9px] uppercase font-bold opacity-60">Último Pago</p>
                          <p className="text-sm font-bold">{payments?.[0]?.paymentDate ? new Date(payments[0].paymentDate + 'T12:00:00').toLocaleDateString() : "---"}</p>
                        </div>
                        <div className="p-3 bg-white/10 rounded-lg">
                          <p className="text-[9px] uppercase font-bold opacity-60">Estatus</p>
                          <p className="text-sm font-bold">{Number(activeStudent.outstandingBalance || 0) > 0 ? 'Con Adeudo' : 'Al Corriente'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-md bg-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-headline text-xl text-primary flex items-center gap-2">
                        <CalendarDays className="h-5 w-5" /> Próximos Vencimientos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2 border-b">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">Colegiatura {MONTHS[new Date().getMonth()]}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">Ciclo Escolar 2024</span>
                          </div>
                          {Number(activeStudent.outstandingBalance || 0) > 0 ? (
                            <Badge variant="destructive" className="rounded-full px-4 h-6 uppercase text-[9px]">Pendiente</Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 rounded-full px-4 h-6 uppercase text-[9px]">Cubierto</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl bg-muted/10 opacity-40 text-center">
                  <UserCircle className="h-16 w-16 mb-4" />
                  <p className="text-sm font-medium">Busca un estudiante para ver su resumen financiero.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="historial">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="bg-muted/10 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="font-headline">Historial de Transacciones</CardTitle>
                  <CardDescription>
                    {activeStudent ? `Mostrando pagos de: ${activeStudent.firstName} ${activeStudent.lastName}` : "Busca un alumno para ver su historial."}
                  </CardDescription>
                </div>
                {activeStudent && (
                  <Badge variant="outline" className="bg-white">
                    ID: {activeStudent.studentIdNumber}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="rounded-md border bg-white">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Conceptos / Mes</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Monto Total</TableHead>
                      <TableHead className="text-right">Recibo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingPayments ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                    ) : payments?.length ? payments.map(p => (
                      <TableRow key={p.id} className="hover:bg-muted/5 transition-colors">
                        <TableCell className="font-medium">
                          {new Date(p.paymentDate + 'T12:00:00').toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {p.items?.map((item: any, idx: number) => (
                              <div key={idx} className="text-xs flex items-center gap-2">
                                <span className="font-bold">{item.name}</span>
                                {item.month && <Badge variant="secondary" className="h-4 text-[9px] uppercase">{item.month}</Badge>}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-50">{p.paymentMethod}</Badge>
                        </TableCell>
                        <TableCell className="font-black text-primary text-lg">
                          ${(p.totalAmount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadPDF(p)} title="Descargar Recibo PDF">
                            {isGeneratingPDF === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                          </Button>
                          {!isStudent && (
                            <Button variant="ghost" size="icon" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleWhatsAppNotify(p)} title="Enviar por WhatsApp">
                              {isSendingWA === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                          {activeStudent ? "No hay transacciones registradas." : "Selecciona un alumno para ver su historial."}
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

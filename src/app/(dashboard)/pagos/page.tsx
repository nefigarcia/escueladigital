
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
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  MoreVertical
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc } from "@/firebase"
import { collection, doc, serverTimestamp, getDoc, query, where } from "firebase/firestore"
import { numberToWords } from "@/lib/number-to-words"
import { smartParentCommunicationsDrafting } from "@/ai/flows/smart-parent-communications-drafting"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

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
  
  const studentsRef = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore])
  const feeTypesRef = useMemoFirebase(() => firestore ? collection(firestore, "fee_types") : null, [firestore])
  
  const { data: students } = useCollection(studentsRef)
  const { data: fees } = useCollection(feeTypesRef)

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

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null;
    if (isStudent && profile?.studentIdNumber) {
       return query(collection(firestore, "students", profile.uid, "payments"))
    }
    if (selectedStudent) {
      return collection(firestore, "students", selectedStudent.id, "payments");
    }
    return null;
  }, [firestore, selectedStudent, isStudent, profile])
  
  const { data: payments } = useCollection(paymentsQuery)

  const handleSearchStudent = () => {
    const student = students?.find(s => s.studentIdNumber === selectedStudentId)
    if (student) {
      setSelectedStudent(student)
      setReceivedFrom(student.guardianName || "")
    } else {
      toast({ variant: "destructive", title: "No encontrado" })
    }
  }

  const addItem = (type: 'fee' | 'custom') => {
    setItems([...items, { 
      id: Math.random().toString(36).substr(2, 9), 
      type, 
      name: '', 
      amount: 0 
    }])
  }

  const removeItem = (id: string) => {
    if (items.length === 1) return
    setItems(items.filter(i => i.id !== id))
  }

  const updateItem = (id: string, updates: Partial<PaymentItem>) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates }
        if (updates.feeId && item.type === 'fee') {
          const fee = fees?.find(f => f.id === updates.feeId)
          if (fee) {
            updated.name = fee.name
            updated.amount = fee.baseAmount || 0
            if (!fee.name.toLowerCase().includes('colegiatura')) {
              updated.month = undefined
            }
          }
        }
        return updated
      }
      return item
    }))
  }

  const handleProcessPayment = async () => {
    if (!selectedStudent || items.length === 0 || !firestore) return
    setIsProcessing(true)
    
    try {
      const studentPaymentsRef = collection(firestore, "students", selectedStudent.id, "payments")
      const paymentData = {
        studentId: selectedStudent.id,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        items: items,
        totalAmount: totalAmount,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        receivedFrom: receivedFrom,
        status: 'completado',
        createdAt: serverTimestamp(),
      }
      
      addDocumentNonBlocking(studentPaymentsRef, paymentData)

      const studentDocRef = doc(firestore, "students", selectedStudent.id)
      updateDocumentNonBlocking(studentDocRef, {
        outstandingBalance: Math.max(0, (selectedStudent.outstandingBalance || 0) - totalAmount),
        updatedAt: serverTimestamp(),
      })
      
      toast({ title: "Pago Procesado" })
      setSelectedStudent(null)
      setSelectedStudentId("")
      setReceivedFrom("")
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
        toast({ variant: "destructive", title: "Sin teléfono", description: "El alumno no tiene un número registrado." })
        return
      }

      const draft = await smartParentCommunicationsDrafting({
        templateName: "avisoGeneral",
        contextData: {
          studentName: payment.studentName,
          additionalDetails: `Confirmamos el recibo de su pago por ${payment.totalAmount} MXN. Gracias.`
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

  return (
    <div className="space-y-6">
      <div className="fixed -left-[4000px] top-0">
        <div ref={pdfTemplateRef} className="w-[210mm] p-10 bg-white text-black font-serif">
          {pdfData && (
            <div className="border-[6px] border-double p-10 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-35deg] text-rose-500/10 text-[180px] font-black border-[12px] border-rose-500/10 p-16 rounded-full select-none pointer-events-none uppercase">PAGADO</div>
              
              <div className="flex items-center gap-10 mb-6">
                {pdfData.school.logoUrl && (
                  <img src={pdfData.school.logoUrl} className="h-40 w-40 object-contain" />
                )}
                <div className="flex-1">
                  <h1 className="text-[48px] font-bold leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {pdfData.school.name}
                  </h1>
                </div>
              </div>
              
              <div className="text-center mb-10 space-y-1">
                <p className="font-bold text-2xl uppercase tracking-widest">CCT: {pdfData.school.cct}</p>
                <p className="text-lg italic">{pdfData.school.address}</p>
              </div>

              <div className="text-center mb-10">
                <span className="text-rose-600 font-black text-4xl border-[5px] border-rose-600 px-12 py-4 rounded-2xl uppercase tracking-tighter">PAGADO</span>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-16 border-t-2 border-b-2 border-black/10 py-10 mb-8 text-lg">
                <p><strong>FECHA DEL PAGO:</strong> {pdfData.dateFormatted}</p>
                <p><strong>FOLIO:</strong> {pdfData.payment.id.substring(0, 8).toUpperCase()}</p>
                <p className="col-span-2"><strong>ALUMNO:</strong> {pdfData.payment.studentName}</p>
                <p><strong>MATRÍCULA:</strong> {pdfData.student?.studentIdNumber}</p>
                <p><strong>TELÉFONO:</strong> {pdfData.student?.phone || "N/A"}</p>
                <p className="col-span-2"><strong>DOMICILIO:</strong> {pdfData.student?.address || "N/A"}</p>
                <p className="col-span-2"><strong>RECIBÍ DE:</strong> {pdfData.payment.receivedFrom || "N/A"}</p>
              </div>

              <div className="mb-8 border-2 border-black/5 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-lg">
                  <thead className="bg-slate-100 border-b-2">
                    <tr>
                      <th className="p-5 text-left font-bold">Concepto / Descripción</th>
                      <th className="p-5 text-right font-bold w-48">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(pdfData.payment.items || []).map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-5">
                          {item.name} {item.month ? `- ${item.month}` : ''}
                        </td>
                        <td className="p-5 text-right font-mono font-bold">${(item.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 p-8 rounded-3xl text-center mb-12 border-2 border-black/5">
                <p className="text-base uppercase tracking-[0.2em] text-muted-foreground font-black mb-2">Total Liquidado</p>
                <p className="text-5xl font-black text-black">${(pdfData.payment.totalAmount || 0).toLocaleString()} MXN</p>
                <p className="text-sm font-bold mt-4 uppercase tracking-widest text-slate-600">{pdfData.montoEnLetra}</p>
              </div>

              <div className="mt-20 text-center flex flex-col items-center">
                <div className="w-[300px] border-t-4 border-black pt-4 relative">
                  {pdfData.school.adminSignatureUrl && (
                    <img src={pdfData.school.adminSignatureUrl} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 h-24" />
                  )}
                  <p className="font-black text-lg uppercase tracking-tighter">Firma de área administrativa</p>
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
           <Card className="border-none shadow-md max-w-3xl">
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

                <div className="space-y-2">
                  <Label>Recibí de (Nombre del Tutor/Padre)</Label>
                  <Input value={receivedFrom} onChange={(e) => setReceivedFrom(e.target.value)} placeholder="Nombre de quien entrega el pago..." />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <Label className="text-lg font-bold">Desglose de Conceptos</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => addItem('fee')} className="gap-1">
                        <Plus className="h-4 w-4" /> Concepto
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addItem('custom')} className="gap-1">
                        <Plus className="h-4 w-4" /> Otro
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-12 gap-3 items-start bg-muted/20 p-3 rounded-lg border">
                        <div className="col-span-7 space-y-2">
                          <Label className="text-xs uppercase opacity-50">Concepto {index + 1}</Label>
                          {item.type === 'fee' ? (
                            <>
                              <Select value={item.feeId} onValueChange={(v) => updateItem(item.id, { feeId: v })}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar tarifa..." /></SelectTrigger>
                                <SelectContent>{fees?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                              </Select>
                              {item.name.toLowerCase().includes('colegiatura') && (
                                <div className="mt-2 flex items-center gap-2">
                                  <Label className="text-[10px] uppercase font-bold shrink-0">Mes:</Label>
                                  <Select value={item.month} onValueChange={(v) => updateItem(item.id, { month: v })}>
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Seleccionar mes..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </>
                          ) : (
                            <Input placeholder="Nombre del concepto..." value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value })} />
                          )}
                        </div>
                        <div className="col-span-4 space-y-2">
                          <Label className="text-xs uppercase opacity-50">Monto</Label>
                          <Input 
                            type="number" 
                            value={item.amount || ""} 
                            placeholder="0.00"
                            onChange={(e) => updateItem(item.id, { amount: parseFloat(e.target.value) || 0 })} 
                          />
                        </div>
                        <div className="col-span-1 pt-6">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10" 
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="text-right">
                      <p className="text-xs uppercase opacity-50 font-bold">Total a Cobrar</p>
                      <p className="text-2xl font-black text-primary">${totalAmount.toLocaleString()} MXN</p>
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
                        <SelectItem value="Tarjeta de Crédito/Débito">Tarjeta</SelectItem>
                        <SelectItem value="Depósito Bancario">Depósito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha del Pago</Label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 border-t pt-6">
                <Button className="w-full gap-2 h-12 text-lg font-bold" disabled={isProcessing || !selectedStudent || totalAmount <= 0} onClick={handleProcessPayment}>
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  Confirmar y Registrar Pago (${totalAmount.toLocaleString()})
                </Button>
              </CardFooter>
           </Card>
        </TabsContent>

        <TabsContent value="historial">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader><CardTitle className="font-headline">Transacciones</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Alumno</TableHead>
                      <TableHead>Detalles</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Monto Total</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments?.length ? payments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{new Date(p.paymentDate + 'T12:00:00').toLocaleDateString()}</TableCell>
                        <TableCell className="font-bold">{p.studentName}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {(p.items || []).map((it: any, idx: number) => (
                              <span key={idx} className="text-[10px] text-muted-foreground">• {it.name} {it.month ? `(${it.month})` : ''}</span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{p.paymentMethod}</Badge></TableCell>
                        <TableCell className="font-black text-primary">${(p.totalAmount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right flex justify-end gap-2">
                          <Button variant="ghost" size="icon" disabled={isGeneratingPDF === p.id} onClick={() => handleDownloadPDF(p)} title="Descargar Recibo">
                            {isGeneratingPDF === p.id ? <Loader2 className="h-4 w-4 animate-spin text-destructive" /> : <FileText className="h-4 w-4 text-destructive" />}
                          </Button>
                          {!isStudent && (
                            <Button variant="ghost" size="icon" disabled={isSendingWA === p.id} className="text-emerald-600" onClick={() => handleWhatsAppNotify(p)} title="Enviar WhatsApp">
                              {isSendingWA === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          {selectedStudent ? "No se encontraron pagos para este alumno." : "Selecciona un alumno o revisa el historial general."}
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

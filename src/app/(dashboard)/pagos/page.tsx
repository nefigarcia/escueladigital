
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
  Edit2
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc } from "@/firebase"
import { collection, doc, serverTimestamp, getDoc, query, where } from "firebase/firestore"
import { numberToWords } from "@/lib/number-to-words"
import { smartParentCommunicationsDrafting } from "@/ai/flows/smart-parent-communications-drafting"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
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

  // Edit State
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [editingPayment, setEditingPayment] = React.useState<any | null>(null)
  const [editItems, setEditItems] = React.useState<PaymentItem[]>([])

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
  const editTotalAmount = editItems.reduce((sum, item) => sum + item.amount, 0)

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null;
    if (isStudent && profile?.studentIdNumber) {
       // Note: This path assumes a specific structure for students, adjust if needed
       return query(collection(firestore, "students", profile.uid, "payments"))
    }
    // For admin, we show global or student-specific. 
    // This part of the logic might need global payments if schoolId-based, 
    // but the current schema uses student subcollections.
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

  const addItem = (type: 'fee' | 'custom', isEdit: boolean = false) => {
    const newItem: PaymentItem = { 
      id: Math.random().toString(36).substr(2, 9), 
      type, 
      name: '', 
      amount: 0 
    };
    if (isEdit) {
      setEditItems([...editItems, newItem])
    } else {
      setItems([...items, newItem])
    }
  }

  const removeItem = (id: string, isEdit: boolean = false) => {
    if (isEdit) {
      if (editItems.length === 1) return
      setEditItems(editItems.filter(i => i.id !== id))
    } else {
      if (items.length === 1) return
      setItems(items.filter(i => i.id !== id))
    }
  }

  const updateItem = (id: string, updates: Partial<PaymentItem>, isEdit: boolean = false) => {
    const list = isEdit ? editItems : items;
    const newList = list.map(item => {
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
    });
    
    if (isEdit) setEditItems(newList);
    else setItems(newList);
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

  const handleOpenEdit = (payment: any) => {
    setEditingPayment(payment)
    setEditItems(payment.items || [])
    setIsEditDialogOpen(true)
  }

  const handleUpdatePayment = () => {
    if (!firestore || !editingPayment) return

    const paymentDocRef = doc(firestore, "students", editingPayment.studentId, "payments", editingPayment.id)
    
    updateDocumentNonBlocking(paymentDocRef, {
      ...editingPayment,
      items: editItems,
      totalAmount: editTotalAmount,
      updatedAt: serverTimestamp(),
    })

    setIsEditDialogOpen(false)
    setEditingPayment(null)
    toast({ title: "Pago Actualizado", description: "Los cambios han sido guardados." })
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
        <div ref={pdfTemplateRef} className="w-[210mm] p-[15mm] bg-white text-black font-serif min-h-[297mm]">
          {pdfData && (
            <div className="relative">
              {/* Watermark */}
              <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-35deg] text-rose-500/15 text-[150px] font-bold border-[10px] border-rose-500/15 px-12 py-6 rounded-3xl select-none pointer-events-none uppercase z-0">
                PAGADO
              </div>

              {/* Header */}
              <div className="flex justify-between items-start mb-2">
                <div className="w-1/3">
                  {pdfData.school.logoUrl && (
                    <img src={pdfData.school.logoUrl} className="h-24 w-auto object-contain" alt="Logo" />
                  )}
                </div>
                <div className="w-2/3 text-right">
                  <h1 className="text-[36pt] font-bold leading-none mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {pdfData.school.name}
                  </h1>
                </div>
              </div>
              
              <div className="text-right mb-4">
                <p className="font-bold text-lg">CCT: {pdfData.school.cct}</p>
                <p className="text-sm italic">{pdfData.school.address}</p>
              </div>

              {/* Thick Separator Line */}
              <div className="h-1 bg-black w-full mb-6" />

              {/* Receipt Subheader */}
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

              {/* Main Fields with Separators */}
              <div className="space-y-4 mb-8">
                <div className="border-b border-black/10 py-3 flex items-baseline">
                  <span className="text-sm font-bold uppercase w-32 shrink-0">Recibí de:</span>
                  <span className="text-base italic ml-4">{pdfData.payment.receivedFrom}</span>
                </div>
                <div className="border-b border-black/10 py-3 flex items-baseline">
                  <span className="text-sm font-bold uppercase w-32 shrink-0">Alumno:</span>
                  <span className="text-base italic ml-4">{pdfData.payment.studentName}</span>
                </div>
                <div className="grid grid-cols-2 gap-8 border-b border-black/10 py-3">
                  <div className="flex items-baseline">
                    <span className="text-sm font-bold uppercase w-32 shrink-0">Matrícula:</span>
                    <span className="text-base italic ml-4">{pdfData.student?.studentIdNumber}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-sm font-bold uppercase w-20 shrink-0">Grado:</span>
                    <span className="text-base italic ml-4">{pdfData.student?.gradeLevel}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8 border-b border-black/10 py-3">
                  <div className="flex items-baseline">
                    <span className="text-sm font-bold uppercase w-32 shrink-0">Teléfono:</span>
                    <span className="text-base italic ml-4">{pdfData.student?.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-sm font-bold uppercase w-20 shrink-0">Método:</span>
                    <span className="text-base italic ml-4">{pdfData.payment.paymentMethod}</span>
                  </div>
                </div>
                <div className="border-b border-black/10 py-3 flex items-baseline">
                  <span className="text-sm font-bold uppercase w-32 shrink-0">Domicilio:</span>
                  <span className="text-sm italic ml-4">{pdfData.student?.address || "N/A"}</span>
                </div>
                <div className="border-b border-black/10 py-3 flex items-baseline">
                  <span className="text-sm font-bold uppercase w-32 shrink-0">Concepto:</span>
                  <div className="flex flex-col ml-4">
                    {(pdfData.payment.items || []).map((item: any, idx: number) => (
                      <span key={idx} className="text-base italic">
                        {item.name} {item.month ? `- ${item.month}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Amount Box */}
              <div className="bg-slate-50 p-8 rounded-xl border border-black/5 mb-12">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xl font-bold uppercase">Cantidad:</span>
                  <span className="text-3xl font-black">${(pdfData.payment.totalAmount || 0).toLocaleString()} MXN</span>
                </div>
                <div className="text-center pt-4 border-t border-black/10">
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-700">
                    {pdfData.montoEnLetra}
                  </p>
                </div>
              </div>

              {/* Footer Signature */}
              <div className="mt-32 flex flex-col items-center">
                <div className="w-[300px] border-t-2 border-black relative">
                  {pdfData.school.adminSignatureUrl && (
                    <img src={pdfData.school.adminSignatureUrl} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 h-16 object-contain" alt="Signature" />
                  )}
                  <div className="text-center mt-2">
                    <p className="font-bold text-sm uppercase tracking-tight">Firma de Área Administrativa</p>
                    <p className="text-[10px] text-muted-foreground uppercase mt-1">Sello y Firma Digital</p>
                  </div>
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
                        <TableCell className="text-right flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(p)} title="Editar Pago">
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
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

      {/* Edit Payment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Transacción</DialogTitle>
            <DialogDescription>Modifica los detalles del pago registrado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Alumno</Label>
                <Input value={editingPayment?.studentName || ""} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>Recibí de</Label>
                <Input value={editingPayment?.receivedFrom || ""} onChange={(e) => setEditingPayment({...editingPayment, receivedFrom: e.target.value})} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <Label className="text-lg font-bold">Desglose de Conceptos</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addItem('fee', true)} className="gap-1">
                    <Plus className="h-4 w-4" /> Concepto
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addItem('custom', true)} className="gap-1">
                    <Plus className="h-4 w-4" /> Otro
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {editItems.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-3 items-start bg-muted/20 p-3 rounded-lg border">
                    <div className="col-span-7 space-y-2">
                      <Label className="text-xs uppercase opacity-50">Concepto {index + 1}</Label>
                      {item.type === 'fee' ? (
                        <>
                          <Select value={item.feeId} onValueChange={(v) => updateItem(item.id, { feeId: v }, true)}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar tarifa..." /></SelectTrigger>
                            <SelectContent>{fees?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                          </Select>
                          {item.name.toLowerCase().includes('colegiatura') && (
                            <div className="mt-2 flex items-center gap-2">
                              <Label className="text-[10px] uppercase font-bold shrink-0">Mes:</Label>
                              <Select value={item.month} onValueChange={(v) => updateItem(item.id, { month: v }, true)}>
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
                        <Input placeholder="Nombre del concepto..." value={item.name} onChange={(e) => updateItem(item.id, { name: e.target.value }, true)} />
                      )}
                    </div>
                    <div className="col-span-4 space-y-2">
                      <Label className="text-xs uppercase opacity-50">Monto</Label>
                      <Input 
                        type="number" 
                        value={item.amount || ""} 
                        placeholder="0.00"
                        onChange={(e) => updateItem(item.id, { amount: parseFloat(e.target.value) || 0 }, true)} 
                      />
                    </div>
                    <div className="col-span-1 pt-6">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10" 
                        onClick={() => removeItem(item.id, true)}
                        disabled={editItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end p-4 bg-primary/5 rounded-lg border border-primary/10">
                <div className="text-right">
                  <p className="text-xs uppercase opacity-50 font-bold">Nuevo Total</p>
                  <p className="text-2xl font-black text-primary">${editTotalAmount.toLocaleString()} MXN</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={editingPayment?.paymentMethod} onValueChange={(v) => setEditingPayment({...editingPayment, paymentMethod: v})}>
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
                <Input type="date" value={editingPayment?.paymentDate || ""} onChange={(e) => setEditingPayment({...editingPayment, paymentDate: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdatePayment}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

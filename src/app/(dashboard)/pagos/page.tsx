
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
  Receipt,
  FileText,
  Loader2,
  MessageCircle,
  Plus,
  Trash2,
  CalendarDays,
  UserCircle,
  Edit2,
  Save,
  ShieldCheck,
  Zap
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp, query, where, getDocs, limit, orderBy } from "firebase/firestore"
import { numberToWords } from "@/lib/number-to-words"
import { smartParentCommunicationsDrafting } from "@/ai/flows/smart-parent-communications-drafting"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"

interface PaymentItem {
  id: string;
  type: 'fee' | 'custom';
  feeId?: string;
  name: string;
  amount: number;
  baseAmount: number; 
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
  const [isStripeLoading, setIsStripeLoading] = React.useState(false)
  
  const pdfTemplateRef = React.useRef<HTMLDivElement>(null)
  const [pdfData, setPdfData] = React.useState<any>(null)

  const [selectedStudentId, setSelectedStudentId] = React.useState<string>(initialStudentId)
  const [activeStudentId, setActiveStudentId] = React.useState<string | null>(null)

  const [isEditPaymentOpen, setIsEditPaymentOpen] = React.useState(false)
  const [paymentToEdit, setPaymentToEdit] = React.useState<any>(null)

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
  
  const feesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return query(collection(firestore, "fee_types"), where("schoolId", "==", profile.schoolId))
  }, [firestore, profile])
  const { data: fees } = useCollection(feesQuery)

  const selectedStudentRef = useMemoFirebase(() => {
    if (!firestore || !activeStudentId) return null
    return doc(firestore, "students", activeStudentId)
  }, [firestore, activeStudentId])
  const { data: activeStudent } = useDoc(selectedStudentRef)

  const [paymentMethod, setPaymentMethod] = React.useState<string>("Efectivo")
  const [paymentDate, setPaymentDate] = React.useState<string>(new Date().toISOString().split('T')[0])
  const [receivedFrom, setReceivedFrom] = React.useState<string>("")
  const [isProcessing, setIsProcessing] = React.useState(false)

  const [items, setItems] = React.useState<PaymentItem[]>([
    { id: Math.random().toString(36).substr(2, 9), type: 'fee', name: '', amount: 0, baseAmount: 0, month: "" }
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

  const handleOnlinePayment = async () => {
    if (!activeStudent || !school) return;
    
    setIsStripeLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: activeStudent.id,
          amount: activeStudent.outstandingBalance,
          schoolId: school.id,
          studentName: `${activeStudent.firstName} ${activeStudent.lastName}`,
          email: activeStudent.email || user?.email
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'No se pudo generar la sesión de pago.');
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error de Pago",
        description: error.message
      });
    } finally {
      setIsStripeLoading(false);
    }
  };

  const addItem = (type: 'fee' | 'custom') => {
    const newItem: PaymentItem = { 
      id: Math.random().toString(36).substr(2, 9), 
      type, 
      name: '', 
      amount: 0,
      baseAmount: 0,
      month: ""
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
            updated.baseAmount = fee.baseAmount || 0
            updated.amount = fee.baseAmount || 0
            if (fee.name.toLowerCase().includes('colegiatura')) {
              updated.month = updated.month || MONTHS[new Date().getMonth()];
            } else {
              updated.month = "";
            }
          }
        }
        return updated
      }
      return item
    });
    setItems(newList);
  }

  const totalToPay = items.reduce((sum, it) => sum + (it.amount || 0), 0)
  
  // Lógica de Matemática Financiera para Saldo Pendiente
  // Saldo Restante = Saldo Actual + (Suma de Diferencias entre lo que se debería pagar y lo pagado)
  const debtDelta = items.reduce((acc, item) => {
    const base = item.type === 'fee' ? (item.baseAmount || 0) : (item.amount || 0);
    const paid = item.amount || 0;
    return acc + (base - paid);
  }, 0);

  const currentDebt = Number(activeStudent?.outstandingBalance || 0);
  const remainingBalanceAfterThis = Math.max(0, currentDebt + debtDelta);

  const handleProcessPayment = async () => {
    if (!activeStudent || !firestore || !profile?.schoolId) return
    if (totalToPay <= 0) return

    setIsProcessing(true)
    
    try {
      const studentPaymentsRef = collection(firestore, "students", activeStudent.id, "payments")
      const paymentData = {
        schoolId: profile.schoolId,
        studentId: activeStudent.id,
        studentName: `${activeStudent.firstName} ${activeStudent.lastName}`,
        items: items,
        totalAmount: totalToPay,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        receivedFrom: receivedFrom,
        remainingBalanceAfterThis: remainingBalanceAfterThis,
        status: 'completado',
        createdAt: serverTimestamp(),
      }
      
      await addDocumentNonBlocking(studentPaymentsRef, paymentData)

      const studentDocRef = doc(firestore, "students", activeStudent.id)
      await updateDocumentNonBlocking(studentDocRef, {
        outstandingBalance: remainingBalanceAfterThis,
        updatedAt: serverTimestamp(),
      })
      
      toast({ title: "Pago Procesado con Éxito" })
      setItems([{ id: Math.random().toString(36).substr(2, 9), type: 'fee', name: '', amount: 0, baseAmount: 0, month: "" }])
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
          additionalDetails: `Confirmamos el recibo de su pago por $${payment.totalAmount.toLocaleString()} MXN el día ${new Date(payment.paymentDate + 'T12:00:00').toLocaleDateString()}. Su saldo restante es de $${payment.remainingBalanceAfterThis.toLocaleString()} MXN. ¡Gracias!`
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
        dateFormatted: new Date(payment.paymentDate + 'T12:00:00').toLocaleDateString(),
        finalBalance: payment.remainingBalanceAfterThis ?? remainingBalanceAfterThis
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

  const handleOpenEditPayment = (payment: any) => {
    setPaymentToEdit({ ...payment })
    setIsEditPaymentOpen(true)
  }

  const handleSaveEditPayment = () => {
    if (!firestore || !paymentToEdit || !activeStudentId) return
    const paymentDocRef = doc(firestore, "students", activeStudentId, "payments", paymentToEdit.id)
    updateDocumentNonBlocking(paymentDocRef, {
      paymentDate: paymentToEdit.paymentDate,
      paymentMethod: paymentToEdit.paymentMethod,
      receivedFrom: paymentToEdit.receivedFrom,
      updatedAt: serverTimestamp(),
    })
    setIsEditPaymentOpen(false)
    setPaymentToEdit(null)
    toast({ title: "Transacción actualizada" })
  }

  const handleDeletePayment = async () => {
    if (!firestore || !paymentToEdit || !activeStudentId || !activeStudent) return

    try {
      const paymentItems = paymentToEdit.items || []
      const pDelta = paymentItems.reduce((acc: number, item: any) => {
        const base = item.type === 'fee' ? (item.baseAmount || 0) : (item.amount || 0)
        const paid = item.amount || 0
        return acc + (base - paid)
      }, 0)

      const revertedBalance = Math.max(0, (activeStudent.outstandingBalance || 0) - pDelta)
      
      const studentDocRef = doc(firestore, "students", activeStudentId)
      updateDocumentNonBlocking(studentDocRef, {
        outstandingBalance: revertedBalance,
        updatedAt: serverTimestamp(),
      })

      const paymentDocRef = doc(firestore, "students", activeStudentId, "payments", paymentToEdit.id)
      deleteDocumentNonBlocking(paymentDocRef)

      setIsEditPaymentOpen(false)
      setPaymentToEdit(null)
      toast({ title: "Transacción eliminada", description: "El saldo del alumno ha sido revertido." })
    } catch (e) {
      toast({ variant: "destructive", title: "Error al eliminar" })
    }
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      {/* PDF TEMPLATE (HIDDEN) */}
      <div className="fixed -left-[4000px] top-0">
        <div ref={pdfTemplateRef} className="w-[210mm] p-[15mm] bg-white text-black font-serif min-h-[297mm] relative overflow-hidden">
          {pdfData && (
            <>
              {/* Marca de Agua */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.08] select-none">
                <div className="text-[140px] font-black text-rose-600 border-[16px] border-rose-600 px-10 py-4 -rotate-[35deg] tracking-widest uppercase">
                  PAGADO
                </div>
              </div>

              {/* Encabezado */}
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

              {/* Datos de Transaccion */}
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

              {/* Datos del Alumno */}
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
              </div>

              {/* Desglose */}
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

              {/* Totales */}
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
                  <span className="text-xl font-black">${(pdfData.finalBalance || 0).toLocaleString()} MXN</span>
                </div>
              </div>

              {/* Firma */}
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue={isStudent ? "historial" : "nuevo-pago"} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
              {!isStudent && <TabsTrigger value="nuevo-pago" className="gap-2"><CreditCard className="h-4 w-4" /> Registrar Pago</TabsTrigger>}
              <TabsTrigger value="historial" className="gap-2"><History className="h-4 w-4" /> Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="nuevo-pago">
              {!isStudent && (
                <Card className="border-none shadow-md">
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
                          <Button variant="outline" size="sm" onClick={() => addItem('fee')} className="gap-1"><Plus className="h-4 w-4" /> Tarifa</Button>
                          <Button variant="outline" size="sm" onClick={() => addItem('custom')} className="gap-1"><Plus className="h-4 w-4" /> Otro</Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {items.map((item, index) => {
                          const isColegiatura = item.type === 'fee' && item.name.toLowerCase().includes('colegiatura');
                          const showMonth = isColegiatura;

                          return (
                            <div key={item.id} className="grid grid-cols-12 gap-3 items-start bg-muted/20 p-3 rounded-lg border">
                              <div className={showMonth ? "col-span-5 space-y-2" : "col-span-8 space-y-2"}>
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
                              
                              {showMonth && (
                                <div className="col-span-3 space-y-2">
                                  <Label className="text-[10px] uppercase opacity-50">Mes</Label>
                                  <Select value={item.month} onValueChange={(v) => updateItem(item.id, { month: v })}>
                                    <SelectTrigger><SelectValue placeholder="Mes..." /></SelectTrigger>
                                    <SelectContent>
                                      {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              
                              <div className="col-span-3 space-y-2">
                                <Label className="text-[10px] uppercase opacity-50">Monto</Label>
                                <Input type="number" value={item.amount || ""} onChange={(e) => updateItem(item.id, { amount: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
                              </div>
                              <div className="col-span-1 pt-6">
                                <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={items.length === 1}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-end p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <div className="text-right">
                          <p className="text-xs uppercase opacity-50 font-bold">Total a Pagar</p>
                          <p className="text-2xl font-black text-primary">${totalToPay.toLocaleString()} MXN</p>
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
              )}
            </TabsContent>

            <TabsContent value="historial">
              <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="bg-muted/10 border-b">
                  <div className="flex justify-between items-center">
                    <CardTitle className="font-headline">Historial de Transacciones</CardTitle>
                    {activeStudent && <Badge variant="outline" className="bg-white">ID: {activeStudent.studentIdNumber}</Badge>}
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
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingPayments ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                        ) : payments?.length ? payments.map(p => (
                          <TableRow key={p.id} className="hover:bg-muted/5 transition-colors">
                            <TableCell className="font-medium">{new Date(p.paymentDate + 'T12:00:00').toLocaleDateString()}</TableCell>
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
                            <TableCell><Badge variant="outline" className="bg-slate-50">{p.paymentMethod}</Badge></TableCell>
                            <TableCell className="font-black text-primary text-lg">${(p.totalAmount || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right flex justify-end gap-1">
                              {!isStudent && (
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditPayment(p)} title="Editar Transacción">
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
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
                          <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground">{activeStudent ? "No hay transacciones registradas." : "Selecciona un alumno para ver su historial."}</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          {activeStudent ? (
            <div className="space-y-4">
              <Card className={`border-none shadow-lg overflow-hidden transition-colors ${remainingBalanceAfterThis > 0 ? 'bg-rose-600' : 'bg-emerald-600'} text-white`}>
                <CardHeader className="pb-4">
                  <CardTitle className="font-headline text-2xl">Resumen Estudiantil</CardTitle>
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
                  
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">SALDO ACTUAL</p>
                      <p className="text-3xl font-black tracking-tight">
                        ${currentDebt.toLocaleString()} <span className="text-sm font-normal opacity-70">MXN</span>
                      </p>
                    </div>

                    <div className="space-y-1 p-3 bg-white/10 rounded-lg">
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">SALDO PENDIENTE DESPUÉS DE ESTE PAGO</p>
                      <p className="text-2xl font-black tracking-tight text-white">
                        ${remainingBalanceAfterThis.toLocaleString()} <span className="text-sm font-normal opacity-70">MXN</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {activeStudent.outstandingBalance > 0 && (
                <Card className="border-none shadow-md bg-accent text-accent-foreground">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" /> Pago Seguro en Línea
                    </CardTitle>
                    <CardDescription className="text-accent-foreground/80">Paga ahora con Tarjeta, SPEI u OXXO.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full bg-white text-primary hover:bg-white/90 font-bold"
                      disabled={isStripeLoading}
                      onClick={handleOnlinePayment}
                    >
                      {isStripeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                      Pagar ${activeStudent.outstandingBalance.toLocaleString()} MXN
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl bg-muted/10 opacity-40 text-center">
              <UserCircle className="h-16 w-16 mb-4" />
              <p className="text-sm font-medium">Busca un estudiante para ver su resumen financiero.</p>
            </div>
          )}
        </div>
      </div>

      {/* DIALOGO DE EDICION / ELIMINACION */}
      <Dialog open={isEditPaymentOpen} onOpenChange={setIsEditPaymentOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Transacción</DialogTitle>
            <DialogDescription>Modifica los detalles generales del pago.</DialogDescription>
          </DialogHeader>
          {paymentToEdit && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Recibido de</Label>
                <Input 
                  value={paymentToEdit.receivedFrom} 
                  onChange={(e) => setPaymentToEdit({...paymentToEdit, receivedFrom: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha de Pago</Label>
                  <Input 
                    type="date" 
                    value={paymentToEdit.paymentDate} 
                    onChange={(e) => setPaymentToEdit({...paymentToEdit, paymentDate: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Método de Pago</Label>
                  <Select 
                    value={paymentToEdit.paymentMethod} 
                    onValueChange={(v) => setPaymentToEdit({...paymentToEdit, paymentMethod: v})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                      <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="Depósito">Depósito Bancario</SelectItem>
                      <SelectItem value="Stripe Online">Stripe Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg border text-xs text-muted-foreground italic">
                Nota: La edición de montos no está permitida para preservar la integridad de los balances. Si necesitas corregir un monto, por favor elimina el registro.
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="destructive" className="gap-2 sm:mr-auto" onClick={handleDeletePayment}>
              <Trash2 className="h-4 w-4" /> Eliminar Transacción
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditPaymentOpen(false)}>Cancelar</Button>
              <Button className="gap-2" onClick={handleSaveEditPayment}>
                <Save className="h-4 w-4" /> Guardar Cambios
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

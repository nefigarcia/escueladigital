
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
  Download, 
  User, 
  Receipt,
  FileText,
  Loader2,
  MessageCircle
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
  const [selectedFeeId, setSelectedFeeId] = React.useState<string>("")
  const [paymentAmount, setPaymentAmount] = React.useState<string>("")
  const [isProcessing, setIsProcessing] = React.useState(false)

  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null;
    // For students, we show their own payments
    if (isStudent && profile?.studentIdNumber) {
       // First find student internal ID to query subcollection
       // For this prototype MVP, we'll look it up in handleDownloadPDF/WA logic
       // and use a simpler query for history if needed.
       return collection(firestore, "students", profile.uid, "payments");
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
      setPaymentAmount((student.outstandingBalance || 0).toString())
    } else {
      toast({ variant: "destructive", title: "No encontrado" })
    }
  }

  const handleProcessPayment = async () => {
    if (!selectedStudent || !paymentAmount || !firestore) return
    setIsProcessing(true)
    const amount = parseFloat(paymentAmount)
    const fee = fees?.find(f => f.id === selectedFeeId)
    
    try {
      const studentPaymentsRef = collection(firestore, "students", selectedStudent.id, "payments")
      addDocumentNonBlocking(studentPaymentsRef, {
        studentId: selectedStudent.id,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        feeName: fee?.name || "Pago General",
        amount: amount,
        paymentDate: new Date().toISOString(),
        paymentMethod: "Efectivo/Transferencia",
        status: 'completado',
        createdAt: serverTimestamp(),
      })

      const studentDocRef = doc(firestore, "students", selectedStudent.id)
      updateDocumentNonBlocking(studentDocRef, {
        outstandingBalance: Math.max(0, (selectedStudent.outstandingBalance || 0) - amount),
        updatedAt: serverTimestamp(),
      })
      
      toast({ title: "Pago Procesado" })
      setSelectedStudent(null)
      setSelectedStudentId("")
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
          additionalDetails: `Confirmamos el recibo de su pago por ${payment.amount} MXN correspondiente a ${payment.feeName}. Gracias.`
        }
      })

      const text = encodeURIComponent(draft.draftMessage)
      window.open(`https://wa.me/52${student.phone}?text=${text}`, '_blank')
      toast({ title: "Asistente IA", description: "Borrador de WhatsApp listo." })
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
        montoEnLetra: numberToWords(payment.amount),
        dateFormatted: new Date(payment.paymentDate).toLocaleDateString()
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
      {/* PDF TEMPLATE HIDDEN */}
      <div className="fixed -left-[3000px]">
        <div ref={pdfTemplateRef} className="w-[210mm] p-10 bg-white">
          {pdfData && (
            <div className="border-4 border-double p-8 relative">
              {/* Pagado Legend */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-30deg] text-rose-500/10 text-9xl font-black border-8 border-rose-500/10 p-10 rounded-full select-none pointer-events-none">PAGADO</div>
              
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <img src={pdfData.school.logoUrl} className="h-24 w-24 object-contain" />
                <div className="flex-1">
                  <h1 className="text-4xl font-serif font-bold text-black" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {pdfData.school.name}
                  </h1>
                </div>
              </div>
              
              {/* Centered CCT and Address */}
              <div className="text-center mb-8">
                <p className="font-bold text-lg">CCT: {pdfData.school.cct}</p>
                <p className="text-sm italic">{pdfData.school.address}</p>
              </div>

              {/* Red PAGADO text */}
              <div className="text-center mb-6">
                <span className="text-rose-600 font-black text-2xl border-4 border-rose-600 px-6 py-2 rounded-lg">PAGADO</span>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-10 border-t border-b py-8 mb-8 text-sm">
                <p><strong>FECHA DEL PAGO:</strong> {pdfData.dateFormatted}</p>
                <p><strong>ID DE PAGO:</strong> {pdfData.payment.id}</p>
                <p className="col-span-2"><strong>RECIBÍ DE:</strong> {pdfData.student?.guardianName || "N/A"}</p>
                <p className="col-span-2"><strong>ALUMNO:</strong> {pdfData.payment.studentName}</p>
                <p><strong>MATRÍCULA:</strong> {pdfData.student?.studentIdNumber}</p>
                <p><strong>TELÉFONO:</strong> {pdfData.student?.phone || "N/A"}</p>
                <p className="col-span-2"><strong>DOMICILIO:</strong> {pdfData.student?.address || "N/A"}</p>
                <p className="col-span-2"><strong>CONCEPTO DE PAGO:</strong> {pdfData.payment.feeName}</p>
              </div>

              {/* Amount Box */}
              <div className="bg-slate-100 p-8 rounded-xl text-center mb-12">
                <p className="text-5xl font-black text-primary">${pdfData.payment.amount.toLocaleString()} MXN</p>
                <p className="text-xs font-bold mt-4 uppercase tracking-widest">{pdfData.montoEnLetra}</p>
              </div>

              {/* Signature Footer */}
              <div className="mt-24 text-center flex flex-col items-center">
                <div className="w-80 border-t-2 border-black pt-2 relative">
                  {pdfData.school.adminSignatureUrl && (
                    <img src={pdfData.school.adminSignatureUrl} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 h-20" />
                  )}
                  <p className="font-bold uppercase tracking-tighter">Firma de área administrativa</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-headline font-bold text-primary">Pagos y Finanzas</h2>
        <p className="text-muted-foreground">Gestión financiera escolar inteligente.</p>
      </div>

      <Tabs defaultValue={isStudent ? "historial" : "nuevo-pago"} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          {!isStudent && <TabsTrigger value="nuevo-pago" className="gap-2"><CreditCard className="h-4 w-4" /> Registrar Pago</TabsTrigger>}
          <TabsTrigger value="historial" className="gap-2"><History className="h-4 w-4" /> Historial</TabsTrigger>
        </TabsList>
        <TabsContent value="nuevo-pago">
           <Card className="border-none shadow-md max-w-2xl">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="font-headline">Nueva Transacción</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>ID Estudiante</Label>
                    <div className="flex gap-2">
                      <Input value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} />
                      <Button onClick={handleSearchStudent} size="icon" variant="secondary"><Search className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Alumno</Label>
                    <Input value={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : ""} disabled />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Concepto</Label>
                    <Select value={selectedFeeId} onValueChange={setSelectedFeeId}>
                      <SelectTrigger><SelectValue placeholder="Concepto..." /></SelectTrigger>
                      <SelectContent>{fees?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Monto</Label>
                    <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 border-t pt-4">
                <Button className="w-full gap-2" disabled={isProcessing || !selectedStudent} onClick={handleProcessPayment}>
                  <CheckCircle2 className="h-4 w-4" /> Confirmar Pago
                </Button>
              </CardFooter>
           </Card>
        </TabsContent>
        <TabsContent value="historial">
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader><CardTitle className="font-headline">Transacciones</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Alumno</TableHead><TableHead>Concepto</TableHead><TableHead>Monto</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {payments?.length ? payments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                        <TableCell className="font-bold">{p.studentName}</TableCell>
                        <TableCell>{p.feeName}</TableCell>
                        <TableCell className="font-black text-primary">${p.amount}</TableCell>
                        <TableCell className="text-right flex justify-end gap-2">
                          <Button variant="ghost" size="icon" disabled={isGeneratingPDF === p.id} onClick={() => handleDownloadPDF(p)}>
                            {isGeneratingPDF === p.id ? <Loader2 className="h-4 w-4 animate-spin text-destructive" /> : <FileText className="h-4 w-4 text-destructive" />}
                          </Button>
                          {!isStudent && (
                            <Button variant="ghost" size="icon" disabled={isSendingWA === p.id} className="text-emerald-600" onClick={() => handleWhatsAppNotify(p)}>
                              {isSendingWA === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )) : <TableRow><TableCell colSpan={5} className="text-center py-10">Sin registros.</TableCell></TableRow>}
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

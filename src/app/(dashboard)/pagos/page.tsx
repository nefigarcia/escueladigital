
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
  Wallet,
  FileText,
  Loader2
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc } from "@/firebase"
import { collection, doc, serverTimestamp, getDoc } from "firebase/firestore"
import { numberToWords } from "@/lib/number-to-words"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

export default function PagosPage() {
  const { firestore } = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState<string | null>(null)
  
  // Ref for PDF template
  const pdfTemplateRef = React.useRef<HTMLDivElement>(null)
  const [pdfData, setPdfData] = React.useState<any>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // User Profile for schoolId
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "staff_roles", user.uid)
  }, [firestore, user])
  const { data: profile } = useDoc(profileRef)

  // School Data
  const schoolRef = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return doc(firestore, "schools", profile.schoolId)
  }, [firestore, profile])
  const { data: school } = useDoc(schoolRef)
  
  const studentsRef = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore])
  const feeTypesRef = useMemoFirebase(() => firestore ? collection(firestore, "fee_types") : null, [firestore])
  
  const { data: students } = useCollection(studentsRef)
  const { data: fees } = useCollection(feeTypesRef)

  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("")
  const [selectedStudent, setSelectedStudent] = React.useState<any | null>(null)
  const [selectedFeeId, setSelectedFeeId] = React.useState<string>("")
  const [paymentAmount, setPaymentAmount] = React.useState<string>("")
  const [isProcessing, setIsProcessing] = React.useState(false)

  // Subscriptions for payments
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (selectedStudent) {
      return collection(firestore, "students", selectedStudent.id, "payments");
    }
    return null;
  }, [firestore, selectedStudent])
  
  const { data: payments } = useCollection(paymentsQuery)

  const handleSearchStudent = () => {
    const student = students?.find(s => s.studentIdNumber === selectedStudentId)
    if (student) {
      setSelectedStudent(student)
      setPaymentAmount((student.outstandingBalance || 0).toString())
      toast({
        title: "Estudiante encontrado",
        description: `${student.firstName} ${student.lastName} - Saldo: $${student.outstandingBalance || 0} MXN`,
      })
    } else {
      setSelectedStudent(null)
      toast({
        variant: "destructive",
        title: "No encontrado",
        description: "El ID de estudiante no existe en el sistema.",
      })
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
        paymentMethod: "Tarjeta",
        status: 'completado',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      const studentDocRef = doc(firestore, "students", selectedStudent.id)
      const currentBalance = selectedStudent.outstandingBalance || 0
      updateDocumentNonBlocking(studentDocRef, {
        outstandingBalance: Math.max(0, currentBalance - amount),
        updatedAt: serverTimestamp(),
      })
      
      toast({
        title: "Pago Procesado",
        description: `Registrado por $${paymentAmount} MXN.`,
      })

      setSelectedStudent(null)
      setSelectedStudentId("")
      setSelectedFeeId("")
      setPaymentAmount("")
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo procesar el pago." })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadPDF = async (payment: any) => {
    if (!school || !firestore) return;
    setIsGeneratingPDF(payment.id);
    
    try {
      const studentSnap = await getDoc(doc(firestore, "students", payment.studentId));
      const studentData = studentSnap.exists() ? studentSnap.data() : selectedStudent;

      const fullData = {
        payment,
        student: { ...studentData, id: payment.studentId },
        school,
        montoEnLetra: numberToWords(payment.amount),
        dateFormatted: new Date(payment.paymentDate || Date.now()).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      };

      setPdfData(fullData);

      setTimeout(async () => {
        if (pdfTemplateRef.current) {
          const canvas = await html2canvas(pdfTemplateRef.current, {
            scale: 2,
            useCORS: true,
            logging: false,
          });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`Recibo_Pago_${payment.id.substring(0, 8)}.pdf`);
          setPdfData(null);
          setIsGeneratingPDF(null);
          toast({ title: "Recibo Descargado", description: "El PDF se generó exitosamente." });
        }
      }, 600);
    } catch (error) {
      console.error("PDF Error:", error);
      setIsGeneratingPDF(null);
      toast({ variant: "destructive", title: "Error", description: "No se pudo generar el PDF." });
    }
  };

  if (!mounted) return null

  return (
    <div className="space-y-6">
      {/* PDF TEMPLATE (HIDDEN) */}
      <div className="fixed -left-[2000px] top-0">
        <div ref={pdfTemplateRef} className="w-[210mm] bg-white p-[20mm] text-[#333]" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
          {pdfData && (
            <div className="border-2 border-gray-200 p-8 relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-25deg] border-8 border-red-500 text-red-500 text-8xl font-black opacity-20 px-12 py-6 rounded-3xl pointer-events-none">
                PAGADO
              </div>
              <div className="flex justify-between items-start mb-10">
                <div className="w-32 h-32 flex items-center justify-center">
                  {pdfData.school.logoUrl ? (
                    <img src={pdfData.school.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 rounded-full flex items-center justify-center">
                      <Receipt className="w-16 h-16 text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-right ml-8">
                  <h1 className="text-[36px] font-bold leading-tight" style={{ fontFamily: "'Baskerville', 'Times New Roman', serif" }}>
                    {pdfData.school.name}
                  </h1>
                  <div className="text-center mt-4">
                    <p className="font-bold text-lg">CCT: {pdfData.school.cct}</p>
                    <p className="text-sm italic">{pdfData.school.address}</p>
                  </div>
                </div>
              </div>
              <div className="border-t-2 border-b-2 border-black py-4 mb-8 flex justify-between">
                <div>
                  <p className="font-bold">RECIBO DE PAGO</p>
                  <p className="text-sm">Folio: <span className="font-mono">{pdfData.payment.id.toUpperCase()}</span></p>
                </div>
                <div className="text-right">
                  <p className="font-bold">FECHA</p>
                  <p>{pdfData.dateFormatted}</p>
                </div>
              </div>
              <div className="space-y-6 text-lg mb-12">
                <div className="flex border-b pb-2"><span className="w-48 font-bold">RECIBÍ DE:</span><span className="flex-1 italic">{pdfData.student.guardianName || "N/A"}</span></div>
                <div className="flex border-b pb-2"><span className="w-48 font-bold">ALUMNO:</span><span className="flex-1">{pdfData.student.firstName} {pdfData.student.lastName}</span></div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex border-b pb-2"><span className="w-40 font-bold">MATRÍCULA:</span><span className="flex-1">{pdfData.student.studentIdNumber}</span></div>
                  <div className="flex border-b pb-2"><span className="w-40 font-bold">GRADO:</span><span className="flex-1">{pdfData.student.gradeLevel}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex border-b pb-2"><span className="w-40 font-bold">TELÉFONO:</span><span className="flex-1">{pdfData.student.phone || "N/A"}</span></div>
                  <div className="flex border-b pb-2"><span className="w-40 font-bold">MÉTODO:</span><span className="flex-1">{pdfData.payment.paymentMethod}</span></div>
                </div>
                <div className="flex border-b pb-2"><span className="w-48 font-bold">DOMICILIO:</span><span className="flex-1 text-sm">{pdfData.student.address}</span></div>
                <div className="flex border-b pb-2"><span className="w-48 font-bold">CONCEPTO:</span><span className="flex-1 font-bold">{pdfData.payment.feeName}</span></div>
              </div>
              <div className="bg-gray-100 p-8 rounded-lg mb-12">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold">CANTIDAD:</span>
                  <span className="text-4xl font-black">${parseFloat(pdfData.payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                </div>
                <p className="text-sm font-bold text-center border-t border-gray-400 pt-4 uppercase">{pdfData.montoEnLetra}</p>
              </div>
              <div className="mt-24 flex flex-col items-center">
                <div className="w-80 text-center border-t-2 border-black pt-4 relative">
                  {pdfData.school.adminSignatureUrl && (
                    <img 
                      src={pdfData.school.adminSignatureUrl} 
                      alt="Firma" 
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 h-20 w-auto object-contain"
                    />
                  )}
                  <p className="font-bold uppercase">Firma de área administrativa</p>
                  <p className="text-xs text-gray-500 mt-1">Sello y Validación Digital</p>
                </div>
              </div>
              <div className="text-center mt-12 text-[10px] text-gray-400 uppercase tracking-widest">Documento de validez oficial - Escuela Digital MX</div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-headline font-bold text-primary">Pagos y Finanzas</h2>
        <p className="text-muted-foreground">Procesamiento automatizado de transacciones y consulta de historial.</p>
      </div>

      <Tabs defaultValue="nuevo-pago" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="nuevo-pago" className="gap-2"><CreditCard className="h-4 w-4" /> Registrar Pago</TabsTrigger>
          <TabsTrigger value="historial" className="gap-2"><History className="h-4 w-4" /> Historial de Pagos</TabsTrigger>
        </TabsList>
        <TabsContent value="nuevo-pago">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 border-none shadow-md overflow-hidden">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="font-headline text-xl">Nueva Transacción</CardTitle>
                <CardDescription>Selecciona un estudiante por ID para pre-llenar los datos.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Número de ID Estudiante</Label>
                    <div className="flex gap-2">
                      <Input id="studentId" placeholder="Ej. 2024001" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchStudent()} />
                      <Button onClick={handleSearchStudent} size="icon" variant="secondary"><Search className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre Estudiante</Label>
                    <Input value={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : ""} disabled placeholder="Se llenará automáticamente" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fee">Concepto de Pago</Label>
                    <Select value={selectedFeeId} onValueChange={setSelectedFeeId}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar concepto..." /></SelectTrigger>
                      <SelectContent>{fees?.map(fee => (<SelectItem key={fee.id} value={fee.id}>{fee.name} - ${fee.baseAmount}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto a Pagar (MXN)</Label>
                    <Input id="amount" type="number" placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-6 bg-muted/20">
                <Button variant="outline" onClick={() => setSelectedStudent(null)}>Cancelar</Button>
                <Button disabled={!selectedStudent || isProcessing} className="gap-2" onClick={handleProcessPayment}>
                  {isProcessing ? "Procesando..." : <><CheckCircle2 className="h-4 w-4" /> Confirmar Pago</>}
                </Button>
              </CardFooter>
            </Card>
            <div className="space-y-6">
              <Card className="bg-primary text-primary-foreground shadow-lg">
                <CardHeader><CardTitle className="font-headline">Resumen Estudiantil</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {selectedStudent ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><User className="h-6 w-6" /></div>
                        <div><p className="font-bold">{selectedStudent.firstName} {selectedStudent.lastName}</p><p className="text-xs opacity-70">Grado: {selectedStudent.gradeLevel}</p></div>
                      </div>
                      <div className="pt-4 border-t border-white/20"><p className="text-xs opacity-70 mb-1">SALDO TOTAL PENDIENTE</p><p className="text-3xl font-bold">${selectedStudent.outstandingBalance || 0} MXN</p></div>
                    </>
                  ) : (
                    <div className="text-center py-8 opacity-70"><Search className="h-12 w-12 mx-auto mb-4 opacity-50" /><p className="text-sm">Busca un estudiante para ver su estado rápido.</p></div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="historial">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="font-headline">Historial de Transacciones</CardTitle><CardDescription>Registro histórico de los pagos recibidos.</CardDescription></div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-white">
                <Table>
                  <TableHeader><TableRow><TableHead>Folio</TableHead><TableHead>Estudiante</TableHead><TableHead>Concepto</TableHead><TableHead>Monto</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Recibo</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {payments?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs text-primary">{payment.id.toUpperCase().substring(0, 8)}</TableCell>
                        <TableCell className="font-medium">{payment.studentName}</TableCell>
                        <TableCell>{payment.feeName}</TableCell>
                        <TableCell className="font-bold">${parseFloat(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</TableCell>
                        <TableCell><Badge variant={payment.status === "completado" ? "default" : "secondary"} className={payment.status === "completado" ? "bg-emerald-500 hover:bg-emerald-600" : ""}>{payment.status.toUpperCase()}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" disabled={isGeneratingPDF === payment.id} onClick={() => handleDownloadPDF(payment)}>
                            {isGeneratingPDF === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-rose-600" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) || (<TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Busca un alumno para ver su historial.</TableCell></TableRow>)}
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

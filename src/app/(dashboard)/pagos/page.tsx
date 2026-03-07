
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
  Calendar as CalendarIcon,
  Receipt,
  Wallet
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp, query, where, limit } from "firebase/firestore"

export default function PagosPage() {
  const { firestore } = useFirestore()
  
  const studentsRef = useMemoFirebase(() => firestore ? collection(firestore, "students") : null, [firestore])
  const feeTypesRef = useMemoFirebase(() => firestore ? collection(firestore, "fee_types") : null, [firestore])
  
  const { data: students } = useCollection(studentsRef)
  const { data: fees } = useCollection(feeTypesRef)

  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("")
  const [selectedStudent, setSelectedStudent] = React.useState<any | null>(null)
  const [selectedFeeId, setSelectedFeeId] = React.useState<string>("")
  const [paymentAmount, setPaymentAmount] = React.useState<string>("")
  const [isProcessing, setIsProcessing] = React.useState(false)

  // Subscriptions for payments (per student)
  const paymentsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedStudent) return null;
    return collection(firestore, "students", selectedStudent.id, "payments");
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
      // 1. Record payment in subcollection
      const studentPaymentsRef = collection(firestore, "students", selectedStudent.id, "payments")
      await addDocumentNonBlocking(studentPaymentsRef, {
        studentId: selectedStudent.id,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        feeName: fee?.name || "Pago General",
        amount: amount,
        paymentDate: serverTimestamp(),
        paymentMethod: "Tarjeta", // Mocking method for now
        status: 'completado',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // 2. Update student balance
      const studentDocRef = doc(firestore, "students", selectedStudent.id)
      const currentBalance = selectedStudent.outstandingBalance || 0
      updateDocumentNonBlocking(studentDocRef, {
        outstandingBalance: Math.max(0, currentBalance - amount),
        updatedAt: serverTimestamp(),
      })
      
      toast({
        title: "Pago Procesado con Éxito",
        description: `Se ha registrado el pago por $${paymentAmount} MXN.`,
      })

      // Reset form
      setSelectedStudent(null)
      setSelectedStudentId("")
      setSelectedFeeId("")
      setPaymentAmount("")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar el pago.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-headline font-bold text-primary">Pagos y Finanzas</h2>
        <p className="text-muted-foreground">Procesamiento automatizado de transacciones y consulta de historial.</p>
      </div>

      <Tabs defaultValue="nuevo-pago" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="nuevo-pago" className="gap-2">
            <CreditCard className="h-4 w-4" /> Registrar Pago
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2">
            <History className="h-4 w-4" /> Historial de Pagos
          </TabsTrigger>
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
                      <Input 
                        id="studentId" 
                        placeholder="Ej. 2024001" 
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchStudent()}
                      />
                      <Button onClick={handleSearchStudent} size="icon" variant="secondary">
                        <Search className="h-4 w-4" />
                      </Button>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar concepto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {fees?.map(fee => (
                          <SelectItem key={fee.id} value={fee.id}>{fee.name} - ${fee.baseAmount}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto a Pagar (MXN)</Label>
                    <Input 
                      id="amount" 
                      type="number" 
                      placeholder="0.00" 
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Método de Pago</Label>
                  <div className="flex gap-4">
                    <label className="flex-1 flex items-center justify-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-accent/10 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all">
                      <input type="radio" name="method" className="sr-only" defaultChecked />
                      <CreditCard className="h-4 w-4" /> Tarjeta
                    </label>
                    <label className="flex-1 flex items-center justify-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-accent/10 has-[:checked]:border-primary has-[:checked]:bg-primary/5 transition-all">
                      <input type="radio" name="method" className="sr-only" />
                      <Wallet className="h-4 w-4" /> Efectivo
                    </label>
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
                <CardHeader>
                  <CardTitle className="font-headline">Resumen Estudiantil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedStudent ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                          <User className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-bold">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                          <p className="text-xs opacity-70">Grado: {selectedStudent.gradeLevel}</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-white/20">
                        <p className="text-xs opacity-70 mb-1">SALDO TOTAL PENDIENTE</p>
                        <p className="text-3xl font-bold">${selectedStudent.outstandingBalance || 0} MXN</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 opacity-70">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Busca un estudiante para ver su estado de cuenta rápido.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-headline text-lg">Próximos Vencimientos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-muted-foreground">Ene 20 - Mensualidad</span>
                    <Badge variant="destructive">Hoy</Badge>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="text-muted-foreground">Feb 01 - Materiales</span>
                    <span className="text-xs">Faltan 11 días</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="historial">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline">Historial de Transacciones</CardTitle>
                <CardDescription>Registro histórico de los pagos recibidos.</CardDescription>
              </div>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Estudiante</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments?.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs text-primary">{payment.id.toUpperCase().substring(0, 8)}</TableCell>
                        <TableCell className="font-medium">{payment.studentName}</TableCell>
                        <TableCell>{payment.feeName}</TableCell>
                        <TableCell className="font-bold">${payment.amount} MXN</TableCell>
                        <TableCell>
                          <Badge 
                            variant={payment.status === "completado" ? "default" : "secondary"}
                            className={payment.status === "completado" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                          >
                            {payment.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon">
                            <Receipt className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          {selectedStudent ? "No se encontraron pagos registrados para este alumno." : "Selecciona un alumno para ver su historial."}
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

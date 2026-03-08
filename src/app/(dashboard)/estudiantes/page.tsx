
"use client"

import * as React from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  UserPlus, 
  MoreVertical, 
  Edit, 
  Trash2,
  Filter,
  Users,
  FileUp,
  Loader2,
  CheckCircle2
} from "lucide-react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useUser, setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp, getDocs, query, where, limit } from "firebase/firestore"
import Papa from "papaparse"

export default function EstudiantesPage() {
  const { firestore } = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)
  
  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  const studentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "students");
  }, [firestore, user])

  const { data: students, isLoading } = useCollection(studentsRef)
  
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isImporting, setIsImporting] = React.useState(false)
  const [importProgress, setImportProgress] = React.useState(0)
  
  const [newStudent, setNewStudent] = React.useState({
    firstName: "",
    lastName: "",
    studentIdNumber: "",
    gradeLevel: "1ro Primaria",
    address: "",
    guardianName: "",
    phone: "",
    email: "",
  })

  const filteredStudents = (students || []).filter(s => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.studentIdNumber && s.studentIdNumber.includes(searchTerm))
  )

  const handleAddStudent = async () => {
    const { firstName, lastName, studentIdNumber } = newStudent;

    if (!firstName.trim() || !lastName.trim() || !studentIdNumber.trim()) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor llena los nombres y la matrícula del estudiante.",
      })
      return
    }

    if (!studentsRef) return

    try {
      addDocumentNonBlocking(studentsRef, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        studentIdNumber: studentIdNumber.trim(),
        gradeLevel: newStudent.gradeLevel.trim(),
        address: newStudent.address.trim(),
        guardianName: newStudent.guardianName.trim(),
        phone: newStudent.phone.trim(),
        email: newStudent.email.trim(),
        enrollmentDate: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        outstandingBalance: 0,
      })

      setIsAddDialogOpen(false)
      setNewStudent({
        firstName: "",
        lastName: "",
        studentIdNumber: "",
        gradeLevel: "1ro Primaria",
        address: "",
        guardianName: "",
        phone: "",
        email: "",
      })
      
      toast({ title: "Estudiante registrado" })
    } catch (e) {
      toast({ variant: "destructive", title: "Error" })
    }
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !firestore) return

    setIsImporting(true)
    setImportProgress(0)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[]
        let processed = 0

        for (const row of rows) {
          try {
            // Mapping logic based on expected CSV headers:
            // Fecha, Matricula, Nombre, Domicilio, RecibiDe, Cantidad, Concepto, Mes
            const matricula = row.Matricula || row.MATRICULA || row.id
            const nombreCompleto = row.Nombre || row.NOMBRE || row["NOMBRE DE ALUMNO"]
            const fecha = row.Fecha || row.FECHA || new Date().toISOString().split('T')[0]
            const cantidad = parseFloat(row.Cantidad || row.CANTIDAD || "0")
            const concepto = row.Concepto || row.CONCEPTO || "Pago Importado"
            const mes = row.Mes || row.MES
            const recibiDe = row.RecibiDe || row.RECIBIDE || row["RECIBI DE"] || ""
            const domicilio = row.Domicilio || row.DOMICILIO || ""

            if (!matricula || !nombreCompleto) continue

            // 1. Check if student exists
            const sQuery = query(collection(firestore, "students"), where("studentIdNumber", "==", matricula), limit(1))
            const sSnap = await getDocs(sQuery)
            
            let studentId = ""
            let studentName = nombreCompleto

            if (sSnap.empty) {
              // Create new student
              const nameParts = nombreCompleto.split(" ")
              const firstName = nameParts[0] || "Importado"
              const lastName = nameParts.slice(1).join(" ") || "Importado"
              
              const newDocRef = doc(collection(firestore, "students"))
              studentId = newDocRef.id
              
              setDocumentNonBlocking(newDocRef, {
                firstName,
                lastName,
                studentIdNumber: matricula,
                address: domicilio,
                guardianName: recibiDe,
                gradeLevel: "Importado",
                outstandingBalance: 0,
                enrollmentDate: fecha,
                createdAt: serverTimestamp(),
              }, { merge: true })
            } else {
              studentId = sSnap.docs[0].id
              studentName = `${sSnap.docs[0].data().firstName} ${sSnap.docs[0].data().lastName}`
            }

            // 2. Register Payment
            const paymentsColRef = collection(firestore, "students", studentId, "payments")
            addDocumentNonBlocking(paymentsColRef, {
              studentId,
              studentName,
              totalAmount: cantidad,
              paymentDate: fecha,
              paymentMethod: "Importación",
              receivedFrom: recibiDe,
              status: "completado",
              items: [{
                id: Math.random().toString(36).substr(2, 9),
                name: concepto,
                amount: cantidad,
                month: mes,
                type: 'custom'
              }],
              createdAt: serverTimestamp(),
            })

            // 3. Update Balance (Optional: subtract if debt exists)
            // For now, we assume imported payments are successful additions to history
            
          } catch (err) {
            console.error("Error importing row:", err)
          }
          
          processed++
          setImportProgress(Math.round((processed / rows.length) * 100))
        }

        setIsImporting(false)
        toast({
          title: "Importación Finalizada",
          description: `Se han procesado ${processed} registros correctamente.`,
        })
      }
    })
  }

  const handleDeleteStudent = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, "students", id))
    toast({ title: "Estudiante eliminado" })
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary">Gestión de Estudiantes</h2>
          <p className="text-muted-foreground">Registro y control de la comunidad estudiantil.</p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleImportCSV} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              disabled={isImporting}
            />
            <Button variant="outline" className="gap-2" disabled={isImporting}>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              Importar CSV
            </Button>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" /> Registrar Estudiante
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nuevo Registro Estudiantil</DialogTitle>
                <DialogDescription>Ingresa los datos básicos del alumno.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombres</Label>
                    <Input value={newStudent.firstName} onChange={(e) => setNewStudent({...newStudent, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellidos</Label>
                    <Input value={newStudent.lastName} onChange={(e) => setNewStudent({...newStudent, lastName: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Matrícula / ID</Label>
                    <Input value={newStudent.studentIdNumber} onChange={(e) => setNewStudent({...newStudent, studentIdNumber: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Grado</Label>
                    <Input value={newStudent.gradeLevel} onChange={(e) => setNewStudent({...newStudent, gradeLevel: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tutor</Label>
                    <Input value={newStudent.guardianName} onChange={(e) => setNewStudent({...newStudent, guardianName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input value={newStudent.phone} onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddStudent}>Guardar Registro</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isImporting && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4 flex items-center gap-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-sm font-bold">Importando datos... {importProgress}%</p>
              <div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${importProgress}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre o ID..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" /> Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Grado</TableHead>
                  <TableHead>Inscripción</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">Cargando...</TableCell></TableRow>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium text-primary">{student.studentIdNumber}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{student.firstName} {student.lastName}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{student.address}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>{student.guardianName || "-"}</span>
                          <span className="text-[10px] text-muted-foreground">{student.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{student.gradeLevel}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{student.enrollmentDate}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2"><Edit className="h-4 w-4" /> Editar</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2"><Users className="h-4 w-4" /> Historial</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive gap-2" onClick={() => handleDeleteStudent(student.id)}>
                              <Trash2 className="h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No hay resultados.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

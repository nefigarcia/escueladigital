
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
  Users
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
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase"
import { collection, doc, serverTimestamp } from "firebase/firestore"

export default function EstudiantesPage() {
  const { firestore } = useFirestore()
  const [mounted, setMounted] = React.useState(false)
  
  React.useEffect(() => {
    setMounted(true)
  }, [])
  
  const studentsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, "students");
  }, [firestore])

  const { data: students, isLoading } = useCollection(studentsRef)
  
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  
  const [newStudent, setNewStudent] = React.useState({
    firstName: "",
    lastName: "",
    studentIdNumber: "",
    gradeLevel: "1ro Primaria",
    address: "",
    guardianName: "",
    phone: "",
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

    if (!studentsRef) {
      toast({
        variant: "destructive",
        title: "Error de Conexión",
        description: "La base de datos no está disponible en este momento. Intente de nuevo.",
      })
      return
    }

    try {
      await addDocumentNonBlocking(studentsRef, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        studentIdNumber: studentIdNumber.trim(),
        gradeLevel: newStudent.gradeLevel.trim(),
        address: newStudent.address.trim(),
        guardianName: newStudent.guardianName.trim(),
        phone: newStudent.phone.trim(),
        guardianIds: [],
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
      })
      
      toast({
        title: "Estudiante registrado",
        description: `${firstName} ha sido añadido exitosamente.`,
      })
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar al estudiante.",
      })
    }
  }

  const handleDeleteStudent = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, "students", id))
    toast({
      title: "Estudiante eliminado",
      description: "El registro ha sido removido del sistema.",
    })
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary">Gestión de Estudiantes</h2>
          <p className="text-muted-foreground">Registro y control de la comunidad estudiantil.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto gap-2">
              <UserPlus className="h-4 w-4" /> Registrar Estudiante
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nuevo Registro Estudiantil</DialogTitle>
              <DialogDescription>
                Ingresa los datos básicos del alumno.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombres</Label>
                  <Input 
                    id="firstName" 
                    value={newStudent.firstName}
                    onChange={(e) => setNewStudent({...newStudent, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellidos</Label>
                  <Input 
                    id="lastName" 
                    value={newStudent.lastName}
                    onChange={(e) => setNewStudent({...newStudent, lastName: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studentIdNumber">Matrícula / ID</Label>
                  <Input 
                    id="studentIdNumber" 
                    value={newStudent.studentIdNumber}
                    onChange={(e) => setNewStudent({...newStudent, studentIdNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gradeLevel">Grado</Label>
                  <Input 
                    id="gradeLevel" 
                    value={newStudent.gradeLevel}
                    onChange={(e) => setNewStudent({...newStudent, gradeLevel: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guardianName">Tutor</Label>
                  <Input 
                    id="guardianName" 
                    placeholder="Nombre del padre o tutor"
                    value={newStudent.guardianName}
                    onChange={(e) => setNewStudent({...newStudent, guardianName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input 
                    id="phone" 
                    placeholder="Ej. 5512345678"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input 
                  id="address" 
                  value={newStudent.address}
                  onChange={(e) => setNewStudent({...newStudent, address: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddStudent}>Guardar Registro</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button variant="outline" className="gap-2 flex-1 md:flex-none">
                <Filter className="h-4 w-4" /> Filtros
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold text-foreground">ID</TableHead>
                  <TableHead className="font-bold text-foreground">Estudiante</TableHead>
                  <TableHead className="font-bold text-foreground">Tutor</TableHead>
                  <TableHead className="font-bold text-foreground">Grado</TableHead>
                  <TableHead className="font-bold text-foreground">Inscripción</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">Cargando...</TableCell>
                  </TableRow>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-accent/5 transition-colors">
                      <TableCell className="font-medium text-primary">{student.studentIdNumber}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{student.firstName} {student.lastName}</span>
                          <span className="text-xs text-muted-foreground uppercase">{student.address}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>{student.guardianName || "-"}</span>
                          {student.phone && <span className="text-xs text-muted-foreground">{student.phone}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium">
                          {student.gradeLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {student.enrollmentDate}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem className="gap-2">
                              <Edit className="h-4 w-4" /> Editar Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Users className="h-4 w-4" /> Historial Académico
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive gap-2"
                              onClick={() => handleDeleteStudent(student.id)}
                            >
                              <Trash2 className="h-4 w-4" /> Dar de Baja
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No se encontraron estudiantes con ese criterio.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

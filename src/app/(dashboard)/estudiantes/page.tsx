
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
  Phone,
  Mail,
  Filter,
  Users
} from "lucide-react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
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
import { MOCK_STUDENTS, Student } from "@/lib/mock-data"
import { toast } from "@/hooks/use-toast"

export default function EstudiantesPage() {
  const [students, setStudents] = React.useState<Student[]>(MOCK_STUDENTS)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  
  const [newStudent, setNewStudent] = React.useState({
    name: "",
    idNumber: "",
    curp: "",
    grade: "1º A",
    guardianName: "",
    guardianPhone: "",
    guardianEmail: "",
  })

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.idNumber.includes(searchTerm)
  )

  const handleAddStudent = () => {
    if (!newStudent.name || !newStudent.idNumber) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor llena el nombre y el ID del estudiante.",
      })
      return
    }

    const student: Student = {
      id: Math.random().toString(36).substr(2, 9),
      ...newStudent,
      outstandingBalance: 0,
    }

    setStudents([student, ...students])
    setIsAddDialogOpen(false)
    setNewStudent({
      name: "",
      idNumber: "",
      curp: "",
      grade: "1º A",
      guardianName: "",
      guardianPhone: "",
      guardianEmail: "",
    })
    
    toast({
      title: "Estudiante registrado",
      description: `${student.name} ha sido añadido exitosamente.`,
    })
  }

  const handleDeleteStudent = (id: string) => {
    setStudents(students.filter(s => s.id !== id))
    toast({
      title: "Estudiante eliminado",
      description: "El registro ha sido removido del sistema.",
    })
  }

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
                Ingresa los datos básicos del alumno y su tutor.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo</Label>
                  <Input 
                    id="name" 
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idNumber">Matrícula / ID</Label>
                  <Input 
                    id="idNumber" 
                    value={newStudent.idNumber}
                    onChange={(e) => setNewStudent({...newStudent, idNumber: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="curp">CURP</Label>
                  <Input 
                    id="curp" 
                    value={newStudent.curp}
                    onChange={(e) => setNewStudent({...newStudent, curp: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grado</Label>
                  <Input 
                    id="grade" 
                    value={newStudent.grade}
                    onChange={(e) => setNewStudent({...newStudent, grade: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardian">Nombre del Tutor</Label>
                <Input 
                  id="guardian" 
                  value={newStudent.guardianName}
                  onChange={(e) => setNewStudent({...newStudent, guardianName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input 
                    id="phone" 
                    value={newStudent.guardianPhone}
                    onChange={(e) => setNewStudent({...newStudent, guardianPhone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={newStudent.guardianEmail}
                    onChange={(e) => setNewStudent({...newStudent, guardianEmail: e.target.value})}
                  />
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
                  <TableHead className="font-bold text-foreground">Grado</TableHead>
                  <TableHead className="font-bold text-foreground">Tutor</TableHead>
                  <TableHead className="font-bold text-foreground">Estado de Cuenta</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-accent/5 transition-colors">
                      <TableCell className="font-medium text-primary">{student.idNumber}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{student.name}</span>
                          <span className="text-xs text-muted-foreground uppercase">{student.curp}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium">
                          {student.grade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{student.guardianName}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {student.guardianPhone}</span>
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {student.guardianEmail}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.outstandingBalance > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                            <span className="font-bold text-destructive">${student.outstandingBalance} MXN</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-bold text-emerald-600">Al corriente</span>
                          </div>
                        )}
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

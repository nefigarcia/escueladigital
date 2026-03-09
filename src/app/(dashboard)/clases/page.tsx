
"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { 
  CalendarDays, 
  Plus, 
  Clock, 
  User, 
  MapPin, 
  ChevronLeft, 
  ChevronRight,
  Search,
  BookOpen,
  CheckSquare
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
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
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useUser, useDoc } from "@/firebase"
import { collection, doc, serverTimestamp, setDoc, query, where } from "firebase/firestore"
import { Checkbox } from "@/components/ui/checkbox"

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

export default function ClasesPage() {
  const { firestore } = useFirestore()
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)
  
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "staff_roles", user.uid)
  }, [firestore, user])
  const { data: profile } = useDoc(profileRef)

  const schedulesRef = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null;
    return query(collection(firestore, "schedules"), where("schoolId", "==", profile.schoolId));
  }, [firestore, profile])
  
  const { data: schedules, isLoading } = useCollection(schedulesRef)

  const studentsRef = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return query(collection(firestore, "students"), where("schoolId", "==", profile.schoolId))
  }, [firestore, profile])
  const { data: students } = useCollection(studentsRef)

  const [date, setDate] = React.useState<Date | undefined>(undefined)
  const [selectedDay, setSelectedDay] = React.useState("Lunes")
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isAttendanceOpen, setIsAttendanceOpen] = React.useState(false)
  const [selectedClass, setSelectedClass] = React.useState<any>(null)
  const [attendanceRecords, setAttendanceRecords] = React.useState<Record<string, boolean>>({})

  const [newClass, setNewClass] = React.useState({
    subject: "",
    teacher: "",
    room: "",
    startTime: "08:00",
    endTime: "09:30",
    dayOfWeek: "Lunes",
  })

  React.useEffect(() => {
    if (mounted && !date) {
      setDate(new Date())
    }
  }, [mounted, date])

  const handleAddClass = async () => {
    if (!newClass.subject || !newClass.teacher || !profile?.schoolId || !firestore) return

    addDocumentNonBlocking(collection(firestore, "schedules"), {
      ...newClass,
      schoolId: profile.schoolId,
      color: "bg-indigo-100 border-indigo-400 text-indigo-700",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    setIsAddDialogOpen(false)
    setNewClass({
      subject: "",
      teacher: "",
      room: "",
      startTime: "08:00",
      endTime: "09:30",
      dayOfWeek: "Lunes",
    })
    toast({ title: "Clase programada" })
  }

  const handleDeleteClass = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, "schedules", id))
    toast({ title: "Clase removida" })
  }

  const handleOpenAttendance = (cls: any) => {
    setSelectedClass(cls)
    const initial: Record<string, boolean> = {}
    students?.forEach(s => initial[s.id] = true)
    setAttendanceRecords(initial)
    setIsAttendanceOpen(true)
  }

  const handleSaveAttendance = () => {
    if (!firestore || !selectedClass || !profile?.schoolId) return

    const attendanceId = `${selectedClass.id}_${new Date().toISOString().split('T')[0]}`
    const attendanceDocRef = doc(firestore, "attendance", attendanceId)

    const records = Object.entries(attendanceRecords).map(([studentId, isPresent]) => ({
      studentId,
      status: isPresent ? "presente" : "ausente"
    }))

    setDoc(attendanceDocRef, {
      schoolId: profile.schoolId,
      classId: selectedClass.id,
      className: selectedClass.subject,
      date: new Date().toISOString().split('T')[0],
      records,
      createdAt: serverTimestamp()
    }, { merge: true })

    setIsAttendanceOpen(false)
    toast({
      title: "Asistencia Guardada",
      description: "La lista de hoy ha sido registrada exitosamente."
    })
  }

  const dailySchedules = (schedules || []).filter(s => s.dayOfWeek === selectedDay)

  if (!mounted) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary">Horarios y Asistencia</h2>
          <p className="text-muted-foreground">Gestión de programación académica y control de asistencia.</p>
        </div>
        
        {profile?.role !== "Alumno" && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Nueva Clase
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Programar Nueva Sesión</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre de la Materia</Label>
                  <Input placeholder="Ej. Física Moderna" value={newClass.subject} onChange={(e) => setNewClass({...newClass, subject: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Docente</Label>
                  <Input placeholder="Ej. Dr. Mario Moreno" value={newClass.teacher} onChange={(e) => setNewClass({...newClass, teacher: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Salón</Label>
                    <Input placeholder="Aula 301" value={newClass.room} onChange={(e) => setNewClass({...newClass, room: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Día</Label>
                    <Select value={newClass.dayOfWeek} onValueChange={(v) => setNewClass({...newClass, dayOfWeek: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DAYS.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Inicio</Label>
                    <Input type="time" value={newClass.startTime} onChange={(e) => setNewClass({...newClass, startTime: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fin</Label>
                    <Input type="time" value={newClass.endTime} onChange={(e) => setNewClass({...newClass, endTime: e.target.value})} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddClass}>Guardar Horario</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3"><CardTitle className="text-lg font-headline">Navegación</CardTitle></CardHeader>
            <CardContent>
              <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border shadow-none p-0" />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm border">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {DAYS.map((day) => (
                <Button key={day} variant={selectedDay === day ? "default" : "ghost"} onClick={() => setSelectedDay(day)} className="rounded-lg px-6">
                  {day}
                </Button>
              ))}
            </div>
          </div>

          <Card className="border-none shadow-sm min-h-[500px]">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <CardTitle className="font-headline text-xl">Agenda del {selectedDay}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">Cargando...</div>
                ) : dailySchedules.length > 0 ? (
                  dailySchedules.map((item) => (
                    <div key={item.id} className="group p-6 flex flex-col md:flex-row md:items-center gap-6 hover:bg-muted/30">
                      <div className="flex flex-row md:flex-col items-center gap-2 md:w-24 shrink-0 font-bold text-lg text-primary">
                        <span>{item.startTime}</span>
                        <div className="h-px w-4 bg-muted-foreground/30 hidden md:block" />
                        <span className="text-sm text-muted-foreground">{item.endTime}</span>
                      </div>
                      <div className={`flex-1 rounded-xl border p-4 ${item.color || 'bg-muted/10'} shadow-sm`}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg flex items-center gap-2"><BookOpen className="h-4 w-4" />{item.subject}</h4>
                          <Badge variant="secondary" className="bg-white/50">{item.room}</Badge>
                        </div>
                        <div className="flex gap-4 text-sm mt-4 opacity-80">
                          <div className="flex items-center gap-1.5"><User className="h-4 w-4" />{item.teacher}</div>
                        </div>
                      </div>
                      {profile?.role !== "Alumno" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" className="gap-2" onClick={() => handleOpenAttendance(item)}>
                            <CheckSquare className="h-4 w-4" /> Asistencia
                          </Button>
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDeleteClass(item.id)}>Eliminar</Button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 opacity-50">
                    <CalendarDays className="h-16 w-16 mb-4" />
                    <p>No hay actividades programadas</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pasar Lista - {selectedClass?.subject}</DialogTitle>
            <DialogDescription>Fecha: {new Date().toLocaleDateString()}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-auto py-4">
            <div className="space-y-2">
              {students?.map(student => (
                <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id={`student-${student.id}`} 
                      checked={attendanceRecords[student.id]} 
                      onCheckedChange={(checked) => setAttendanceRecords({...attendanceRecords, [student.id]: !!checked})} 
                    />
                    <Label htmlFor={`student-${student.id}`} className="font-bold">
                      {student.firstName} {student.lastName}
                    </Label>
                  </div>
                  <Badge variant={attendanceRecords[student.id] ? "default" : "secondary"}>
                    {attendanceRecords[student.id] ? "Presente" : "Ausente"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAttendanceOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAttendance}>Confirmar Asistencia</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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
  CheckSquare,
  Loader2,
  AlertTriangle,
  Sparkles,
  Wand2,
  Info,
  CheckCircle2,
  Trash2
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
import { Progress } from "@/components/ui/progress"

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

  const schoolRef = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return doc(firestore, "schools", profile.schoolId)
  }, [firestore, profile])
  const { data: school } = useDoc(schoolRef)

  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return query(
      collection(firestore, "staff_roles"),
      where("schoolId", "==", profile.schoolId)
    )
  }, [firestore, profile])
  const { data: staffList } = useCollection(staffQuery)
  
  const teachers = React.useMemo(() => {
    return (staffList || []).filter(s => s.role === "Administrador" || s.role === "Academico")
  }, [staffList])

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
  const [isGeneratorOpen, setIsGeneratorOpen] = React.useState(false)
  const [selectedClass, setSelectedClass] = React.useState<any>(null)
  const [attendanceRecords, setAttendanceRecords] = React.useState<Record<string, boolean>>({})

  // Generator State
  const [genStep, setGenStep] = React.useState(1)
  const [genSubjects, setGenSubjects] = React.useState<{subject: string, frequency: number, checked: boolean}[]>([])
  const [genProgress, setGenProgress] = React.useState(0)
  const [isGenerating, setIsGenerating] = React.useState(false)

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

  // Sync selectedDay with calendar interaction
  React.useEffect(() => {
    if (date) {
      const dayIndex = date.getDay(); // 0 is Sunday, 1 is Monday...
      const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      const dayName = dayNames[dayIndex];
      // Only set if it's a weekday, but let's allow setting it to show "No class" on weekends
      setSelectedDay(dayName);
    }
  }, [date]);

  // Sync unique subjects for generator
  React.useEffect(() => {
    if (schedules && schedules.length > 0) {
      const unique = Array.from(new Set(schedules.map(s => s.subject))).map(sub => ({
        subject: sub,
        frequency: 1,
        checked: true
      }))
      setGenSubjects(unique)
    }
  }, [schedules])

  const timeToMinutes = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const checkConflict = (startTime: string, endTime: string, day: string, teacher: string, room: string, excludeId?: string) => {
    const nStart = timeToMinutes(startTime)
    const nEnd = timeToMinutes(endTime)
    const rStart = timeToMinutes(school?.recessStart || "10:30")
    const rEnd = timeToMinutes(school?.recessEnd || "11:00")
    
    const overlaps = (s1: number, e1: number, s2: number, e2: number) => s1 < e2 && e1 > s2;

    // Check Recess
    if (overlaps(nStart, nEnd, rStart, rEnd)) return "Receso Institucional"

    // Check against existing
    const dailySchedules = (schedules || []).filter(s => s.dayOfWeek === day && s.id !== excludeId)
    for (const existing of dailySchedules) {
      const exStart = timeToMinutes(existing.startTime)
      const exEnd = timeToMinutes(existing.endTime)

      if (overlaps(nStart, nEnd, exStart, exEnd)) {
        if (existing.teacher === teacher) return `Traslape de Docente (${existing.subject})`
        if (existing.room === room) return `Traslape de Salón (${existing.room})`
      }
    }
    return null
  }

  const handleAddClass = async () => {
    if (!newClass.subject || !newClass.teacher || !profile?.schoolId || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "Completa los campos obligatorios." })
      return
    }

    const conflict = checkConflict(newClass.startTime, newClass.endTime, newClass.dayOfWeek, newClass.teacher, newClass.room)
    if (conflict) {
      toast({ variant: "destructive", title: "Conflicto", description: conflict })
      return
    }

    addDocumentNonBlocking(collection(firestore, "schedules"), {
      ...newClass,
      schoolId: profile.schoolId,
      color: "bg-indigo-100 border-indigo-400 text-indigo-700",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    setIsAddDialogOpen(false)
    setNewClass({ subject: "", teacher: "", room: "", startTime: "08:00", endTime: "09:30", dayOfWeek: "Lunes" })
    toast({ title: "Clase programada" })
  }

  const handleSmartGenerate = async () => {
    if (!firestore || !profile?.schoolId) return
    setIsGenerating(true)
    setGenProgress(0)

    const selectedToGen = genSubjects.filter(s => s.checked)
    if (selectedToGen.length === 0) {
      toast({ variant: "destructive", title: "Error", description: "Selecciona al menos una materia." })
      setIsGenerating(false)
      return
    }

    const startHour = 8 * 60 // 8 AM
    const endHour = 14 * 60 // 2 PM
    const sessionDuration = 60 // 1 hour per session

    let successes = 0
    let failures = 0

    // Temporary array to track new placements during generation to avoid local conflicts
    const tempPlacements: any[] = []

    for (let i = 0; i < selectedToGen.length; i++) {
      const item = selectedToGen[i]
      const reference = schedules?.find(s => s.subject === item.subject)
      const teacher = reference?.teacher || "Docente Asignado"
      const room = reference?.room || "Aula 1"

      for (let f = 0; f < item.frequency; f++) {
        let placed = false
        // Try random slots
        for (let attempt = 0; attempt < 100; attempt++) {
          const randomDay = DAYS[Math.floor(Math.random() * DAYS.length)]
          const randomStartMinutes = startHour + (Math.floor(Math.random() * ((endHour - startHour) / 15)) * 15)
          const startT = minutesToTime(randomStartMinutes)
          const endT = minutesToTime(randomStartMinutes + sessionDuration)

          // Global check + Temp check
          const globalConflict = checkConflict(startT, endT, randomDay, teacher, room)
          const tempConflict = tempPlacements.some(tp => 
            tp.day === randomDay && 
            (timeToMinutes(startT) < timeToMinutes(tp.endTime) && timeToMinutes(endT) > timeToMinutes(tp.startTime)) &&
            (tp.teacher === teacher || tp.room === room)
          )

          if (!globalConflict && !tempConflict) {
            const payload = {
              subject: item.subject,
              teacher,
              room,
              startTime: startT,
              endTime: endT,
              dayOfWeek: randomDay,
              schoolId: profile.schoolId,
              color: "bg-primary/10 border-primary text-primary",
              createdAt: serverTimestamp(),
            }
            addDocumentNonBlocking(collection(firestore, "schedules"), payload)
            tempPlacements.push({ ...payload, id: Math.random().toString() })
            successes++
            placed = true
            break
          }
        }
        if (!placed) failures++
      }
      setGenProgress(Math.round(((i + 1) / selectedToGen.length) * 100))
    }

    setIsGenerating(false)
    setIsGeneratorOpen(false)
    setGenStep(1)
    toast({
      title: "Generación Finalizada",
      description: `Se crearon ${successes} sesiones. ${failures > 0 ? `No se pudo encontrar espacio para ${failures} sesiones por conflictos de horario.` : ''}`
    })
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
    toast({ title: "Asistencia Guardada" })
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
          <div className="flex gap-2">
            <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5">
                  <Sparkles className="h-4 w-4" /> Generador Inteligente
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary" /> Asistente de Carga Horaria
                  </DialogTitle>
                  <DialogDescription>
                    Distribuye materias automáticamente evitando traslapes y respetando el receso.
                  </DialogDescription>
                </DialogHeader>

                {genStep === 1 ? (
                  <div className="space-y-4 py-4">
                    <div className="bg-muted/30 p-4 rounded-lg flex gap-3 items-start">
                      <Info className="h-5 w-5 text-primary mt-0.5" />
                      <p className="text-xs leading-relaxed">
                        Selecciona las materias que deseas programar. El sistema usará el <b>Docente y Salón</b> de la última clase registrada para cada materia como referencia.
                      </p>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                      {genSubjects.length > 0 ? genSubjects.map((item, idx) => (
                        <div key={item.subject} className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/20 transition-colors">
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              id={`gen-${idx}`} 
                              checked={item.checked} 
                              onCheckedChange={(c) => {
                                const next = [...genSubjects]
                                next[idx].checked = !!c
                                setGenSubjects(next)
                              }}
                            />
                            <Label htmlFor={`gen-${idx}`} className="font-bold">{item.subject}</Label>
                          </div>
                          <div className="flex items-center gap-3">
                            <Label className="text-[10px] uppercase opacity-60">Veces x Semana</Label>
                            <Input 
                              type="number" 
                              className="w-16 h-8 text-center" 
                              min={1} max={5}
                              value={item.frequency}
                              onChange={(e) => {
                                const next = [...genSubjects]
                                next[idx].frequency = parseInt(e.target.value) || 1
                                setGenSubjects(next)
                              }}
                            />
                          </div>
                        </div>
                      )) : (
                        <p className="text-center py-10 text-muted-foreground italic">Registra al menos una clase manualmente para tener referencias.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center space-y-6">
                    <div className="flex justify-center">
                      <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                        <Sparkles className="h-10 w-10 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Generando Horario...</h3>
                      <p className="text-muted-foreground text-sm">Validando docentes, aulas y recesos.</p>
                    </div>
                    <div className="px-10">
                      <Progress value={genProgress} className="h-2" />
                      <p className="text-[10px] mt-2 text-primary font-bold uppercase tracking-widest">{genProgress}% Completado</p>
                    </div>
                  </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                  {genStep === 1 ? (
                    <>
                      <Button variant="ghost" onClick={() => setIsGeneratorOpen(false)}>Cancelar</Button>
                      <Button onClick={() => setGenStep(2)} disabled={genSubjects.length === 0}>Siguiente Paso</Button>
                    </>
                  ) : (
                    <Button onClick={handleSmartGenerate} disabled={isGenerating} className="w-full h-11 text-lg">
                      {isGenerating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                      Iniciar Generación
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Nueva Clase
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Programar Nueva Sesión</DialogTitle>
                  <DialogDescription>Se validará automáticamente si hay conflictos.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre de la Materia</Label>
                    <Input placeholder="Ej. Física Moderna" value={newClass.subject} onChange={(e) => setNewClass({...newClass, subject: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Docente</Label>
                    <Select value={newClass.teacher} onValueChange={(v) => setNewClass({...newClass, teacher: v})}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar docente..." /></SelectTrigger>
                      <SelectContent>
                        {teachers.map((t) => (
                          <SelectItem key={t.uid} value={`${t.firstName} ${t.lastName}`}>{t.firstName} {t.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 italic">
                      Recuerda que no se pueden programar clases durante el receso de <b>{school?.recessStart || "10:30"} a {school?.recessEnd || "11:00"}</b>.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAddClass}>Guardar Horario</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-none shadow-sm h-fit overflow-hidden">
            <CardHeader className="pb-3 bg-primary/5">
              <CardTitle className="text-lg font-headline">Navegación</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center p-2">
              <Calendar 
                mode="single" 
                selected={date} 
                onSelect={setDate} 
                className="rounded-md w-full max-w-full" 
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm border overflow-hidden">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {[...DAYS, "Sábado", "Domingo"].map((day) => (
                <Button key={day} variant={selectedDay === day ? "default" : "ghost"} onClick={() => setSelectedDay(day)} className="rounded-lg px-6 shrink-0">
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
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : dailySchedules.length > 0 ? (
                  dailySchedules.sort((a,b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)).map((item) => (
                    <div key={item.id} className="group p-6 flex flex-col md:flex-row md:items-center gap-6 hover:bg-muted/30 transition-colors">
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
                          <Button size="sm" variant="outline" className="text-destructive border-none hover:bg-destructive/10" onClick={() => handleDeleteClass(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 opacity-50">
                    <CalendarDays className="h-16 w-16 mb-4 text-muted-foreground" />
                    <p className="font-medium">No hay actividades para el {selectedDay}</p>
                    <p className="text-sm">Usa el Generador Inteligente para llenar la agenda.</p>
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


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
  BookOpen
} from "lucide-react"
import { MOCK_SCHEDULES, ClassSchedule } from "@/lib/mock-data"
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

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

export default function ClasesPage() {
  const [schedules, setSchedules] = React.useState<ClassSchedule[]>(MOCK_SCHEDULES)
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [selectedDay, setSelectedDay] = React.useState("Lunes")
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)

  const [newClass, setNewClass] = React.useState<Partial<ClassSchedule>>({
    subject: "",
    teacher: "",
    room: "",
    startTime: "08:00",
    endTime: "09:30",
    dayOfWeek: "Lunes",
  })

  const handleAddClass = () => {
    if (!newClass.subject || !newClass.teacher) return

    const schedule: ClassSchedule = {
      id: `s-${Math.random().toString(36).substr(2, 5)}`,
      subject: newClass.subject,
      teacher: newClass.teacher,
      room: newClass.room || "Aula pendiente",
      startTime: newClass.startTime!,
      endTime: newClass.endTime!,
      dayOfWeek: newClass.dayOfWeek!,
      color: "bg-indigo-100 border-indigo-400 text-indigo-700",
    }

    setSchedules([...schedules, schedule])
    setIsAddDialogOpen(false)
    setNewClass({
      subject: "",
      teacher: "",
      room: "",
      startTime: "08:00",
      endTime: "09:30",
      dayOfWeek: "Lunes",
    })
    toast({
      title: "Clase programada",
      description: `La sesión de ${schedule.subject} ha sido añadida.`,
    })
  }

  const handleDeleteClass = (id: string) => {
    setSchedules(schedules.filter(s => s.id !== id))
    toast({
      title: "Clase removida",
      description: "El horario ha sido actualizado.",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary">Horarios y Clases</h2>
          <p className="text-muted-foreground">Gestión de programación académica y reservas de espacios.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Nueva Clase
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Programar Nueva Sesión</DialogTitle>
              <DialogDescription>Asigna materia, docente y horario para una nueva clase.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nombre de la Materia</Label>
                <Input 
                  placeholder="Ej. Física Moderna" 
                  value={newClass.subject}
                  onChange={(e) => setNewClass({...newClass, subject: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Docente</Label>
                <Input 
                  placeholder="Ej. Dr. Mario Moreno" 
                  value={newClass.teacher}
                  onChange={(e) => setNewClass({...newClass, teacher: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Salón / Espacio</Label>
                  <Input 
                    placeholder="Aula 301" 
                    value={newClass.room}
                    onChange={(e) => setNewClass({...newClass, room: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Día de la Semana</Label>
                  <Select 
                    value={newClass.dayOfWeek} 
                    onValueChange={(v) => setNewClass({...newClass, dayOfWeek: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora Inicio</Label>
                  <Input 
                    type="time" 
                    value={newClass.startTime}
                    onChange={(e) => setNewClass({...newClass, startTime: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Fin</Label>
                  <Input 
                    type="time" 
                    value={newClass.endTime}
                    onChange={(e) => setNewClass({...newClass, endTime: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddClass}>Guardar Horario</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-headline">Navegación</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border shadow-none p-0"
              />
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-headline">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Grado / Grupo</label>
                <Select defaultValue="1a">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar grado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1a">1º A</SelectItem>
                    <SelectItem value="1b">1º B</SelectItem>
                    <SelectItem value="2a">2º A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Docente</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar docente..." className="pl-9" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm border">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {DAYS.map((day) => (
                <Button
                  key={day}
                  variant={selectedDay === day ? "default" : "ghost"}
                  onClick={() => setSelectedDay(day)}
                  className="rounded-lg px-6"
                >
                  {day}
                </Button>
              ))}
            </div>
            <div className="hidden sm:flex items-center gap-2 px-4 border-l">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">Semana 4 (Ene 2024)</span>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-sm min-h-[600px]">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <CardTitle className="font-headline text-xl">Agenda del {selectedDay}</CardTitle>
              </div>
              <CardDescription>Sesiones académicas programadas para este día.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {schedules.filter(s => s.dayOfWeek === selectedDay).length > 0 ? (
                  schedules.filter(s => s.dayOfWeek === selectedDay).map((item) => (
                    <div 
                      key={item.id} 
                      className="group p-6 flex flex-col md:flex-row md:items-center gap-6 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex flex-row md:flex-col items-center gap-2 md:w-24 shrink-0">
                        <Clock className="h-4 w-4 text-muted-foreground md:hidden" />
                        <span className="font-bold text-lg text-primary">{item.startTime}</span>
                        <div className="h-px w-4 bg-muted-foreground/30 hidden md:block" />
                        <span className="text-sm text-muted-foreground">{item.endTime}</span>
                      </div>

                      <div className={`flex-1 rounded-xl border p-4 ${item.color} shadow-sm group-hover:scale-[1.01] transition-transform`}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            {item.subject}
                          </h4>
                          <Badge variant="secondary" className="bg-white/50">{item.room}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm mt-4">
                          <div className="flex items-center gap-1.5 opacity-80">
                            <User className="h-4 w-4" />
                            {item.teacher}
                          </div>
                          <div className="flex items-center gap-1.5 opacity-80">
                            <MapPin className="h-4 w-4" />
                            {item.room}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline">Ver Alumnos</Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClass(item.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 opacity-50">
                    <CalendarDays className="h-16 w-16 mb-4 text-muted-foreground" />
                    <p className="text-lg">No hay actividades programadas</p>
                    <p className="text-sm">Para el {selectedDay.toLowerCase()} seleccionado.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

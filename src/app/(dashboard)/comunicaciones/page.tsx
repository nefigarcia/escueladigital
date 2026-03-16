
"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Send, Copy, RotateCcw, MessageSquarePlus, Loader2 } from "lucide-react"
import { smartParentCommunicationsDrafting } from "@/ai/flows/smart-parent-communications-drafting"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"

export default function ComunicacionesPage() {
  const { firestore } = useFirestore()
  const { user } = useUser()
  const [loading, setLoading] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const [template, setTemplate] = React.useState<"recordatorioDePago" | "avisoDeEvento" | "avisoGeneral">("avisoGeneral")
  
  const [formData, setFormData] = React.useState({
    studentId: "",
    additionalDetails: "",
    eventName: "",
    eventDate: "",
    eventTime: "",
    eventLocation: "",
  })

  // Fetch Real Students
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "staff_roles", user.uid)
  }, [firestore, user])
  const { data: profile } = useDoc(profileRef)

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return query(collection(firestore, "students"), where("schoolId", "==", profile.schoolId))
  }, [firestore, profile])
  const { data: students, isLoading: isLoadingStudents } = useCollection(studentsQuery)

  const handleGenerate = async () => {
    if (!formData.studentId) {
      toast({ variant: "destructive", title: "Selecciona un estudiante" })
      return
    }

    setLoading(true)
    try {
      const student = students?.find(s => s.id === formData.studentId)
      
      const result = await smartParentCommunicationsDrafting({
        templateName: template,
        contextData: {
          studentId: student?.studentIdNumber,
          studentName: `${student?.firstName} ${student?.lastName}`,
          guardianName: student?.guardianName,
          outstandingBalance: student?.outstandingBalance || 0,
          additionalDetails: formData.additionalDetails,
          eventName: formData.eventName,
          eventDate: formData.eventDate,
          eventTime: formData.eventTime,
          eventLocation: formData.eventLocation,
          dueDate: new Date().toISOString().split('T')[0],
        }
      })
      
      setDraft(result.draftMessage)
      toast({
        title: "Borrador Generado",
        description: "La IA ha creado un mensaje basado en datos reales del alumno.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al generar",
        description: "No se pudo contactar con el servicio de IA.",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draft)
    toast({
      title: "Copiado",
      description: "Mensaje copiado al portapapeles.",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary">Asistente de Comunicación IA</h2>
          <p className="text-muted-foreground">Redacta avisos profesionales para padres utilizando la base de datos real.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 border-none shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-lg flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-primary" /> Parámetros del Mensaje
            </CardTitle>
            <CardDescription>Define el propósito y el destinatario del aviso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Plantilla de Comunicación</Label>
              <Select value={template} onValueChange={(v: any) => setTemplate(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="avisoGeneral">Aviso General</SelectItem>
                  <SelectItem value="recordatorioDePago">Recordatorio de Pago</SelectItem>
                  <SelectItem value="avisoDeEvento">Invitación a Evento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estudiante</Label>
              <Select value={formData.studentId} onValueChange={(v) => setFormData({...formData, studentId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingStudents ? "Cargando alumnos..." : "Seleccionar alumno..."} />
                </SelectTrigger>
                <SelectContent>
                  {students?.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">La IA redactará el mensaje personalizado para este alumno y su tutor.</p>
            </div>

            {template === "avisoDeEvento" && (
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label>Nombre del Evento</Label>
                  <Input 
                    placeholder="Ej. Festival de Primavera" 
                    onChange={(e) => setFormData({...formData, eventName: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input type="date" onChange={(e) => setFormData({...formData, eventDate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora</Label>
                    <Input type="time" onChange={(e) => setFormData({...formData, eventTime: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Detalles Adicionales / Instrucciones</Label>
              <Textarea 
                placeholder="Ej. Favor de traer ropa deportiva y agua..."
                rows={4}
                value={formData.additionalDetails}
                onChange={(e) => setFormData({...formData, additionalDetails: e.target.value})}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full gap-2" onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" /> Redactar con IA</>}
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-md flex flex-col">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="font-headline text-lg">Borrador Sugerido</CardTitle>
            <CardDescription>Puedes editar el texto antes de enviarlo.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pt-6">
            {draft ? (
              <Textarea 
                className="h-full min-h-[400px] text-base leading-relaxed p-4 font-body"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-50">
                <Sparkles className="h-16 w-16 mb-4 text-primary" />
                <p className="text-lg">Tu mensaje aparecerá aquí...</p>
                <p className="text-sm">Configura los datos a la izquierda y presiona "Redactar con IA".</p>
              </div>
            )}
          </CardContent>
          {draft && (
            <CardFooter className="border-t pt-6 flex justify-between gap-4">
              <Button variant="ghost" onClick={() => setDraft("")} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Limpiar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Send className="h-4 w-4" /> Enviar a WhatsApp / Email
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  )
}

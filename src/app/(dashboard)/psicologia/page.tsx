
"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Brain, Sparkles, FileText, History, Loader2, Save, Trash2 } from "lucide-react"
import { generatePsychologyReport } from "@/ai/flows/student-psychology-report"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, serverTimestamp, doc, where } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function PsicologiaPage() {
  const { firestore } = useFirestore()
  const { user } = useUser()
  const [loading, setLoading] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const [activeTab, setActiveTab] = React.useState("nuevo")
  
  const [formData, setFormData] = React.useState({
    studentId: "",
    observations: "",
    tone: "profesional" as const,
  })

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "staff_roles", user.uid)
  }, [firestore, user])
  const { data: profile } = useDoc(profileRef)

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return query(
      collection(firestore, "students"), 
      where("schoolId", "==", profile.schoolId)
    )
  }, [firestore, profile])
  const { data: students } = useCollection(studentsQuery)

  const reportsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return query(
      collection(firestore, "psychology_reports"), 
      where("schoolId", "==", profile.schoolId),
      orderBy("createdAt", "desc")
    )
  }, [firestore, profile])
  const { data: pastReports, isLoading: isLoadingReports } = useCollection(reportsQuery)

  const handleGenerate = async () => {
    if (!formData.studentId || !formData.observations) {
      toast({ variant: "destructive", title: "Datos incompletos" })
      return
    }

    setLoading(true)
    try {
      const student = students?.find(s => s.id === formData.studentId)
      const result = await generatePsychologyReport({
        studentName: `${student?.firstName} ${student?.lastName}`,
        gradeLevel: student?.gradeLevel || "N/A",
        observations: formData.observations,
        tone: formData.tone
      })
      setDraft(result.reportDraft)
      toast({ title: "Borrador generado con éxito" })
    } catch (error) {
      toast({ variant: "destructive", title: "Error al generar el reporte" })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (!draft || !firestore || !user || !profile?.schoolId) return
    const student = students?.find(s => s.id === formData.studentId)
    
    addDocumentNonBlocking(collection(firestore, "psychology_reports"), {
      schoolId: profile.schoolId,
      studentId: formData.studentId,
      studentName: `${student?.firstName} ${student?.lastName}`,
      content: draft,
      authorId: user.uid,
      authorName: user.email,
      date: new Date().toISOString().split('T')[0],
      status: "Finalizado",
      createdAt: serverTimestamp()
    })

    setDraft("")
    setFormData({ studentId: "", observations: "", tone: "profesional" })
    toast({ title: "Reporte guardado en el historial" })
  }

  const handleDelete = (id: string) => {
    if (!firestore) return
    deleteDocumentNonBlocking(doc(firestore, "psychology_reports", id))
    toast({ title: "Reporte eliminado" })
  }

  const handleViewFullReport = (report: any) => {
    setDraft(report.content)
    setFormData(prev => ({
      ...prev,
      studentId: report.studentId
    }))
    setActiveTab("nuevo")
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-headline font-bold text-primary">Departamento de Psicología</h2>
        <p className="text-muted-foreground">Generación y seguimiento de reportes conductuales y psicopedagógicos.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="nuevo" className="gap-2">
            <Brain className="h-4 w-4" /> Nuevo Reporte
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2">
            <History className="h-4 w-4" /> Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nuevo" className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2 border-none shadow-md">
            <CardHeader>
              <CardTitle className="font-headline text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Datos del Alumno
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Seleccionar Estudiante</Label>
                <Select value={formData.studentId} onValueChange={(v) => setFormData({...formData, studentId: v})}>
                  <SelectTrigger><SelectValue placeholder="Buscar alumno..." /></SelectTrigger>
                  <SelectContent>
                    {students?.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.gradeLevel})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tono del Reporte</Label>
                <Select value={formData.tone} onValueChange={(v: any) => setFormData({...formData, tone: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profesional">Profesional / Formal</SelectItem>
                    <SelectItem value="empático">Empático / Cercano</SelectItem>
                    <SelectItem value="directo">Directo / Conciso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observaciones / Notas Crudas</Label>
                <Textarea 
                  placeholder="Describe las conductas observadas o incidentes..."
                  className="min-h-[200px]"
                  value={formData.observations}
                  onChange={(e) => setFormData({...formData, observations: e.target.value})}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full gap-2" onClick={handleGenerate} disabled={loading || !formData.observations}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generar Borrador con IA
              </Button>
            </CardFooter>
          </Card>

          <Card className="lg:col-span-3 border-none shadow-md flex flex-col">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="font-headline text-lg">Reporte Generado</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-6">
              {draft ? (
                <Textarea 
                  className="h-full min-h-[450px] font-body text-base leading-relaxed"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
                  <Brain className="h-16 w-16 mb-4" />
                  <p>Completa las notas a la izquierda para generar el reporte.</p>
                </div>
              )}
            </CardContent>
            {draft && (
              <CardFooter className="border-t pt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDraft("")}>Descartar</Button>
                <Button className="gap-2" onClick={handleSave}>
                  <Save className="h-4 w-4" /> Guardar en Expediente
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="historial">
          <div className="grid gap-4">
            {isLoadingReports ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pastReports?.length ? pastReports.map((report) => (
              <Card key={report.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-headline">{report.studentName}</CardTitle>
                      <CardDescription>Fecha: {report.date} | Por: {report.authorName}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">Finalizado</Badge>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(report.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/20 p-4 rounded-md text-sm whitespace-pre-wrap line-clamp-3">
                    {report.content}
                  </div>
                  <Button variant="link" className="px-0 mt-2 text-primary" onClick={() => handleViewFullReport(report)}>
                    Ver reporte completo
                  </Button>
                </CardContent>
              </Card>
            )) : (
              <div className="py-20 text-center opacity-50">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <p>No hay reportes previos registrados.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

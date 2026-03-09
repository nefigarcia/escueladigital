
"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  FileText, 
  Plus, 
  Search, 
  ChevronRight, 
  User, 
  BookOpen,
  Award,
  Loader2
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useUser, useDoc } from "@/firebase"
import { collection, query, where, serverTimestamp, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

export default function CalificacionesPage() {
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

  const isStudent = profile?.role === "Alumno"

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return query(collection(firestore, "students"), where("schoolId", "==", profile.schoolId))
  }, [firestore, profile])
  const { data: students } = useCollection(studentsQuery)

  const gradesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    if (isStudent && profile?.studentIdNumber) {
      return query(
        collection(firestore, "grades"), 
        where("schoolId", "==", profile.schoolId),
        where("studentIdNumber", "==", profile.studentIdNumber)
      )
    }
    return query(collection(firestore, "grades"), where("schoolId", "==", profile.schoolId))
  }, [firestore, isStudent, profile])

  const { data: grades, isLoading } = useCollection(gradesQuery)

  const [newGrade, setNewGrade] = React.useState({
    studentId: "",
    studentName: "",
    subject: "",
    score: "",
    period: "Primer Parcial",
  })

  const handleAddGrade = () => {
    if (!newGrade.studentId || !newGrade.score || !firestore || !profile?.schoolId) return

    const student = students?.find(s => s.id === newGrade.studentId)
    
    addDocumentNonBlocking(collection(firestore, "grades"), {
      ...newGrade,
      schoolId: profile.schoolId,
      studentIdNumber: student?.studentIdNumber,
      studentName: `${student?.firstName} ${student?.lastName}`,
      teacherId: user?.uid,
      score: parseFloat(newGrade.score),
      createdAt: serverTimestamp()
    })

    setNewGrade({ studentId: "", studentName: "", subject: "", score: "", period: "Primer Parcial" })
    toast({ title: "Calificación Registrada" })
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary">Calificaciones y Reportes</h2>
          <p className="text-muted-foreground">Control académico y seguimiento de progreso.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {!isStudent && (
          <Card className="lg:col-span-1 border-none shadow-md">
            <CardHeader>
              <CardTitle className="font-headline text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> Capturar Nota
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Estudiante</Label>
                <Select value={newGrade.studentId} onValueChange={(v) => setNewGrade({...newGrade, studentId: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {students?.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Materia</Label>
                <Input placeholder="Ej. Matemáticas" value={newGrade.subject} onChange={(e) => setNewGrade({...newGrade, subject: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Calificación</Label>
                  <Input type="number" step="0.1" max="10" placeholder="0.0" value={newGrade.score} onChange={(e) => setNewGrade({...newGrade, score: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Periodo</Label>
                  <Select value={newGrade.period} onValueChange={(v) => setNewGrade({...newGrade, period: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Primer Parcial">1er Parcial</SelectItem>
                      <SelectItem value="Segundo Parcial">2do Parcial</SelectItem>
                      <SelectItem value="Final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleAddGrade} disabled={!newGrade.studentId}>Guardar Calificación</Button>
            </CardFooter>
          </Card>
        )}

        <Card className={!isStudent ? "lg:col-span-2 border-none shadow-md" : "lg:col-span-3 border-none shadow-md"}>
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2">
              <Award className="h-6 w-6 text-primary" /> 
              {isStudent ? "Mis Calificaciones" : "Historial Académico"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    {!isStudent && <TableHead>Estudiante</TableHead>}
                    <TableHead>Materia</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead className="text-right">Nota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                  ) : grades?.length ? (
                    grades.map((grade) => (
                      <TableRow key={grade.id}>
                        {!isStudent && <TableCell className="font-bold">{grade.studentName}</TableCell>}
                        <TableCell>{grade.subject}</TableCell>
                        <TableCell><Badge variant="outline">{grade.period}</Badge></TableCell>
                        <TableCell className="text-right font-black text-lg text-primary">{grade.score}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No hay registros disponibles.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

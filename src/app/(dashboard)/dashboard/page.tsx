
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Users, 
  TrendingUp, 
  CreditCard, 
  AlertCircle,
  Key,
  CalendarDays,
  Activity,
  FileText,
  Clock
} from "lucide-react"
import { useUser, useDoc, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { doc, collection, query, where } from "firebase/firestore"
import React from "react"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  const { user } = useUser()
  const { firestore } = useFirestore()

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "staff_roles", user.uid)
  }, [firestore, user])

  const { data: profile } = useDoc(userProfileRef)

  const schoolRef = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return doc(firestore, "schools", profile.schoolId)
  }, [firestore, profile])

  const { data: school } = useDoc(schoolRef)

  const isStudent = profile?.role === "Alumno"
  
  const studentDataQuery = useMemoFirebase(() => {
    if (!firestore || !isStudent || !profile?.studentIdNumber || !profile?.schoolId) return null
    return query(
      collection(firestore, "students"), 
      where("schoolId", "==", profile.schoolId),
      where("studentIdNumber", "==", profile.studentIdNumber)
    )
  }, [firestore, isStudent, profile])

  const { data: studentRecords } = useCollection(studentDataQuery)
  const studentInfo = studentRecords?.[0]

  if (isStudent) {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary">¡Hola, {profile?.firstName}!</h2>
          <p className="text-muted-foreground mt-2">Bienvenido a tu portal escolar de <span className="font-bold">{school?.name}</span></p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className={studentInfo?.outstandingBalance ? "border-rose-200 bg-rose-50" : "bg-emerald-50 border-emerald-200"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Estado de Cuenta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${studentInfo?.outstandingBalance || 0} MXN</div>
              <p className="text-xs text-muted-foreground mt-1">
                {studentInfo?.outstandingBalance ? "Tienes pagos pendientes" : "Estás al corriente"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Grado Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{studentInfo?.gradeLevel || "N/A"}</div>
              <p className="text-xs text-muted-foreground mt-1">Ciclo Escolar 2024</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Matrícula</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{studentInfo?.studentIdNumber || "---"}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Clases Próximas
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] flex items-center justify-center border-dashed border-2 rounded-xl bg-muted/20">
              <p className="text-muted-foreground italic">Revisa la pestaña de Horarios para ver tu agenda completa.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Últimas Notas
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[200px] flex items-center justify-center border-dashed border-2 rounded-xl bg-muted/20">
              <p className="text-muted-foreground italic">Tus calificaciones se verán reflejadas aquí al cierre del periodo.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold tracking-tight text-primary">Panel de Control</h2>
          <p className="text-muted-foreground mt-2">
            Institución: <span className="font-bold text-foreground">{school?.name || "Cargando..."}</span>
          </p>
        </div>
        
        {profile?.role === "Administrador" && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-primary rounded-lg text-white">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Código de Activación</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-mono font-bold text-primary">{school?.activationCode || "---"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Estudiantes Activos" value="-" icon={<Users className="h-4 w-4" />} change="0%" trend="neutral" />
        <MetricCard title="Ingresos del Mes" value="$0.00" icon={<TrendingUp className="h-4 w-4" />} change="0%" trend="neutral" />
        <MetricCard title="Avisos Pendientes" value="0" icon={<AlertCircle className="h-4 w-4" />} change="-" trend="neutral" />
        <MetricCard title="Eficiencia de Cobro" value="0%" icon={<CreditCard className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline">Bienvenido, {profile?.firstName}</CardTitle>
            <CardDescription>
              Resumen operativo para {school?.name}. Estás ingresando como <span className="font-bold">{profile?.role}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col items-center justify-center text-center p-6 bg-muted/20 rounded-xl border border-dashed m-6">
            <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground italic max-w-sm">
              Tu base de datos está lista. Comienza registrando estudiantes o configurando tus planes de pago para ver métricas en tiempo real.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-headline">Próximos Eventos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-accent/10 border border-accent/20">
                <CalendarDays className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-bold">Ciclo Escolar 2024</p>
                  <p className="text-xs text-muted-foreground">Configuración inicial completada</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center py-4">No hay eventos próximos registrados.</p>
            </CardContent>
          </Card>
          
          <Card className="bg-accent text-accent-foreground shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-headline">Asistente IA listo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs opacity-80 leading-relaxed">
                Usa el Asistente de Comunicación para redactar avisos a padres de familia de manera automática.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, icon, change, trend }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className={`${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-muted-foreground'} font-medium`}>
              {change}
            </span> vs periodo anterior
          </p>
        )}
      </CardContent>
    </Card>
  )
}

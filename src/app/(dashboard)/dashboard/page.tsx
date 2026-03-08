
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Users, 
  TrendingUp, 
  CreditCard, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  School,
  Key
} from "lucide-react"
import { 
  Bar, 
  BarChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip,
  Cell,
  PieChart,
  Pie
} from "recharts"
import { useUser, useDoc, useFirestore } from "@/firebase"
import { doc } from "firebase/firestore"
import React from "react"

export default function DashboardPage() {
  const { user } = useUser()
  const { firestore } = useFirestore()

  const userProfileRef = React.useMemo(() => {
    if (!firestore || !user) return null
    return doc(firestore, "staff_roles", user.uid)
  }, [firestore, user])

  const { data: profile } = useDoc(userProfileRef)

  const schoolRef = React.useMemo(() => {
    if (!firestore || !profile?.schoolId) return null
    return doc(firestore, "schools", profile.schoolId)
  }, [firestore, profile])

  const { data: school } = useDoc(schoolRef)

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold tracking-tight text-primary">Panel de Control</h2>
          <p className="text-muted-foreground mt-2">Gestionando: <span className="font-bold text-foreground">{school?.name}</span></p>
        </div>
        {profile?.role === "Administrador" && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2 bg-primary rounded-lg text-white">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Código de Activación</p>
                <p className="text-xl font-mono font-bold text-primary">{school?.activationCode}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Basic Metrics (Keep simple for MVP) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Estudiantes" value="128" icon={<Users className="h-4 w-4" />} change="+4.5%" trend="up" />
        <MetricCard title="Ingresos (Mes)" value="$142,450" icon={<TrendingUp className="h-4 w-4" />} change="+12%" trend="up" />
        <MetricCard title="Pendientes" value="14" icon={<AlertCircle className="h-4 w-4" />} change="-2" trend="down" />
        <MetricCard title="Tasa Cobranza" value="92%" icon={<CreditCard className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="font-headline">Bienvenido al Sistema SaaS</CardTitle>
            <CardDescription>Esta escuela opera bajo el ID: {profile?.schoolId}</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground italic">
            Visualización de métricas específicas de la escuela en desarrollo...
          </CardContent>
        </Card>
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
          <p className="text-xs text-muted-foreground">
            <span className={`${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'} font-medium`}>
              {change}
            </span> desde el periodo anterior
          </p>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import * as React from "react"
import Link from "next/link"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardNav } from "@/components/dashboard-nav"
import { Toaster } from "@/components/ui/toaster"
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { Loader2, AlertTriangle, Clock, CreditCard } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

function SubscriptionBanner({ school }: { school: any }) {
  const status = school?.subscriptionStatus
  const trialEndsAt = school?.trialEndsAt?.toDate?.() as Date | undefined

  if (!status || status === "active") return null

  // Trial: calculate days remaining
  if (status === "trial" && trialEndsAt) {
    const now = new Date()
    const daysLeft = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft > 0) {
      return (
        <div className="flex items-center justify-between gap-4 px-6 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              Periodo de prueba: <strong>{daysLeft} día{daysLeft !== 1 ? "s" : ""} restante{daysLeft !== 1 ? "s" : ""}</strong>
            </span>
          </div>
          <Link href="/plans">
            <Button size="sm" variant="outline" className="text-amber-800 border-amber-400 hover:bg-amber-100 h-7 text-xs">
              Activar Plan
            </Button>
          </Link>
        </div>
      )
    }

    // Trial expired
    return (
      <div className="flex items-center justify-between gap-4 px-6 py-2 bg-red-50 border-b border-red-200 text-red-800 text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Tu periodo de prueba ha terminado. Elige un plan para continuar.</span>
        </div>
        <Link href="/plans">
          <Button size="sm" className="h-7 text-xs">Ver Planes</Button>
        </Link>
      </div>
    )
  }

  // Pending payment
  if (status === "pending_payment") {
    return (
      <div className="flex items-center justify-between gap-4 px-6 py-2 bg-blue-50 border-b border-blue-200 text-blue-800 text-sm">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 shrink-0" />
          <span>Tu suscripción está siendo procesada. Puede tomar unos minutos.</span>
        </div>
      </div>
    )
  }

  // Past due / canceled
  if (status === "past_due" || status === "canceled" || status === "unpaid") {
    return (
      <div className="flex items-center justify-between gap-4 px-6 py-2 bg-red-50 border-b border-red-200 text-red-800 text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {status === "past_due" ? "Pago pendiente en tu suscripción." : "Tu suscripción está inactiva."}
          </span>
        </div>
        <Link href="/plans">
          <Button size="sm" className="h-7 text-xs">Renovar Plan</Button>
        </Link>
      </div>
    )
  }

  return null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isUserLoading } = useUser()
  const { firestore } = useFirestore()
  const router = useRouter()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "staff_roles", user.uid)
  }, [firestore, user])

  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef)

  const schoolRef = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return doc(firestore, "schools", profile.schoolId)
  }, [firestore, profile])

  const { data: school, isLoading: isSchoolLoading } = useDoc(schoolRef)

  React.useEffect(() => {
    if (mounted && !isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router, mounted])

  const shouldShowLoader = !mounted || isUserLoading || (user && isProfileLoading && !profile)

  if (shouldShowLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <DashboardNav
          schoolName={school?.name || "Cargando..."}
          logoUrl={school?.logoUrl}
          role={profile?.role}
        />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="flex h-16 items-center border-b px-6 gap-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-xl font-headline font-semibold text-primary">
                {school?.name || "Escuela Digital MX"}
              </h1>
            </div>
            <div className="text-sm text-muted-foreground hidden sm:block">
              Bienvenido,{" "}
              <span className="font-semibold text-foreground">{profile?.firstName || user?.email}</span>
              <span className="ml-2 px-2 py-0.5 bg-muted rounded text-[10px] font-bold uppercase">
                {profile?.role}
              </span>
            </div>
          </header>

          {/* Subscription status banner — only for school Admins */}
          {profile?.role === "Administrador" && school && (
            <SubscriptionBanner school={school} />
          )}

          <main className="flex-1 p-6 overflow-auto">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
          <Toaster />
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}


"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardNav } from "@/components/dashboard-nav"
import { Toaster } from "@/components/ui/toaster"
import { useUser, useDoc, useFirestore } from "@/firebase"
import { doc } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

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

  // Fetch User Role Profile & School Info
  const userProfileRef = React.useMemo(() => {
    if (!firestore || !user) return null
    return doc(firestore, "staff_roles", user.uid)
  }, [firestore, user])

  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef)

  const schoolRef = React.useMemo(() => {
    if (!firestore || !profile?.schoolId) return null
    return doc(firestore, "schools", profile.schoolId)
  }, [firestore, profile])

  const { data: school, isLoading: isSchoolLoading } = useDoc(schoolRef)

  React.useEffect(() => {
    if (mounted && !isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router, mounted])

  // Gate the entire dashboard until we have a user and their profile
  if (!mounted || isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // If after loading we still have no user, the useEffect will handle the redirect
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
              Bienvenido, <span className="font-semibold text-foreground">{profile?.firstName || user?.email}</span>
              <span className="ml-2 px-2 py-0.5 bg-muted rounded text-[10px] font-bold uppercase">{profile?.role}</span>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
          <Toaster />
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

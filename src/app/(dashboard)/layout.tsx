
"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardNav } from "@/components/dashboard-nav"
import { Toaster } from "@/components/ui/toaster"
import { useUser } from "@/firebase"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useUser()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <DashboardNav />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="flex h-16 items-center border-b px-6 gap-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-xl font-headline font-semibold text-primary">Escuela Digital MX</h1>
            </div>
            {mounted && (
              <div className="text-sm text-muted-foreground hidden sm:block">
                {user ? (
                  <>Bienvenido, <span className="font-semibold text-foreground">{user.displayName || user.email || 'Usuario'}</span></>
                ) : (
                  <span className="italic">Sesión no iniciada</span>
                )}
              </div>
            )}
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

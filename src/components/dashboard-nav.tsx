
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Users, 
  CreditCard, 
  Settings, 
  BarChart3, 
  MessageSquare, 
  ShieldCheck, 
  LayoutDashboard,
  GraduationCap,
  CalendarDays,
  LogOut,
  FileText,
  Brain
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { useAuth } from "@/firebase"
import { signOut } from "firebase/auth"

interface DashboardNavProps {
  schoolName: string
  logoUrl?: string
  role?: string
}

export function DashboardNav({ schoolName, logoUrl, role }: DashboardNavProps) {
  const pathname = usePathname()
  const { auth } = useAuth()

  const handleSignOut = () => {
    if (auth) signOut(auth)
  }

  const allItems = [
    { name: "Inicio", icon: LayoutDashboard, href: "/dashboard", roles: ["Administrador", "Academico", "Alumno"] },
    { name: "Estudiantes", icon: Users, href: "/estudiantes", roles: ["Administrador", "Academico"] },
    { name: "Psicología", icon: Brain, href: "/psicologia", roles: ["Administrador", "Academico"] },
    { name: "Horarios", icon: CalendarDays, href: "/clases", roles: ["Administrador", "Academico", "Alumno"] },
    { name: "Calificaciones", icon: FileText, href: "/calificaciones", roles: ["Administrador", "Academico", "Alumno"] },
    { name: "Pagos y Finanzas", icon: CreditCard, href: "/pagos", roles: ["Administrador", "Alumno"] },
    { name: "Reportes", icon: BarChart3, href: "/reportes", roles: ["Administrador"] },
    { name: "Comunicaciones", icon: MessageSquare, href: "/comunicaciones", roles: ["Administrador", "Academico"] },
    { name: "Config. Tarifas", icon: Settings, href: "/tarifas", roles: ["Administrador"] },
    { name: "Personal", icon: ShieldCheck, href: "/staff", roles: ["Administrador"] },
    { name: "Configuración", icon: Settings, href: "/configuracion", roles: ["Administrador", "Academico", "Alumno"] },
  ]

  const filteredItems = allItems.filter(item => !role || item.roles.includes(role))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1 bg-white" />
          ) : (
            <GraduationCap className="h-6 w-6" />
          )}
        </div>
        <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
          <span className="font-headline font-bold text-lg leading-tight truncate">{schoolName}</span>
          <span className="text-xs text-sidebar-foreground/60">Escuela Digital MX</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Menú Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.name}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4 bg-sidebar/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

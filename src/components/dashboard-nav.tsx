
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
  Zap
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const navItems = [
  { name: "Inicio", icon: LayoutDashboard, href: "/" },
  { name: "Estudiantes", icon: Users, href: "/estudiantes" },
  { name: "Horarios y Clases", icon: CalendarDays, href: "/clases" },
  { name: "Config. Tarifas", icon: Settings, href: "/tarifas" },
  { name: "Pagos y Finanzas", icon: CreditCard, href: "/pagos" },
  { name: "Reportes", icon: BarChart3, href: "/reportes" },
  { name: "Comunicaciones", icon: MessageSquare, href: "/comunicaciones" },
  { name: "Roles de Personal", icon: ShieldCheck, href: "/staff" },
  { name: "Probar Conexión", icon: Zap, href: "/test-connection" },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar p-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
          <span className="font-headline font-bold text-lg leading-tight">Escuela Digital</span>
          <span className="text-xs text-sidebar-foreground/60">Admin v1.0</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Menú Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
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
        <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://picsum.photos/seed/admin/40/40" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium">Admin User</span>
            <span className="text-xs text-sidebar-foreground/60">Director Administrativo</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

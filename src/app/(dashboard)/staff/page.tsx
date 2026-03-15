"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Shield, ShieldCheck, ShieldAlert, UserPlus, MoreHorizontal, Trash2, Loader2, Mail } from "lucide-react"
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, deleteDocumentNonBlocking } from "@/firebase"
import { collection, query, where, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function StaffPage() {
  const { user } = useUser()
  const { firestore } = useFirestore()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Obtener perfil del usuario actual para conocer su escuela
  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "staff_roles", user.uid)
  }, [firestore, user])
  const { data: profile } = useDoc(profileRef)

  // Consultar todos los roles asociados a la misma escuela
  const staffQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null
    return query(
      collection(firestore, "staff_roles"),
      where("schoolId", "==", profile.schoolId)
    )
  }, [firestore, profile])

  const { data: staffList, isLoading } = useCollection(staffQuery)

  const handleDeleteStaff = (staffUid: string) => {
    if (!firestore || !staffUid) return
    if (staffUid === user?.uid) {
      toast({
        variant: "destructive",
        title: "Operación no permitida",
        description: "No puedes eliminar tu propio acceso administrativo desde aquí.",
      })
      return
    }

    deleteDocumentNonBlocking(doc(firestore, "staff_roles", staffUid))
    toast({
      title: "Acceso Revocado",
      description: "El usuario ha sido eliminado del personal de la institución.",
    })
  }

  if (!mounted) return null

  // Filtrar solo personal (no alumnos) para esta vista, o mostrar todos si se prefiere
  const staffOnly = (staffList || []).filter(s => s.role !== "Alumno")
  const adminsCount = staffOnly.filter(s => s.role === "Administrador").length
  const academicosCount = staffOnly.filter(s => s.role === "Academico").length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary">Gestión de Personal</h2>
          <p className="text-muted-foreground">Control de acceso y roles para el personal de {profile?.schoolName || "tu institución"}.</p>
        </div>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" /> Invitar Personal
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{adminsCount}</div>
            <p className="text-xs text-muted-foreground">Control total del plantel</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Académicos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{academicosCount}</div>
            <p className="text-xs text-emerald-500 font-medium">Docentes y apoyo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Seguridad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Intentos fallidos hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Personal Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{staffOnly.length}</div>
            <p className="text-xs text-muted-foreground">Usuarios registrados</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Directorio de Personal</CardTitle>
          <CardDescription>Administra quién puede acceder y gestionar la información escolar.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : staffOnly.length > 0 ? (
              staffOnly.map((person) => (
                <div key={person.uid} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 border border-primary/10">
                      <AvatarImage src={`https://picsum.photos/seed/${person.uid}/40/40`} />
                      <AvatarFallback>{person.firstName?.[0]}{person.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-foreground leading-none mb-1">{person.firstName} {person.lastName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {person.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 md:gap-12">
                    <div className="hidden md:flex flex-col items-end">
                      <span className="text-[10px] text-muted-foreground mb-1 uppercase font-bold tracking-wider">Nivel de Acceso</span>
                      <Badge variant="outline" className="gap-1 font-bold">
                        {person.role === "Administrador" ? (
                          <><ShieldCheck className="h-3 w-3 text-primary" /> Admin</>
                        ) : (
                          <><Shield className="h-3 w-3 text-accent-foreground" /> Académico</>
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className="bg-emerald-500 text-white border-none text-[10px] uppercase">
                        Activo
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDeleteStaff(person.uid)}>
                            <Trash2 className="h-4 w-4" /> Revocar Acceso
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center opacity-50">
                <Shield className="h-12 w-12 mx-auto mb-4" />
                <p>No se encontró personal registrado en esta escuela.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

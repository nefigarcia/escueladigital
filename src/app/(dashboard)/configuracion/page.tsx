
"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUser, useDoc, useFirestore, updateDocumentNonBlocking } from "@/firebase"
import { doc, serverTimestamp } from "firebase/firestore"
import { User, School, Save, Shield, BadgeCheck, Camera, Loader2, X, MapPin } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function ConfiguracionPage() {
  const { user } = useUser()
  const { firestore } = useFirestore()
  const [mounted, setMounted] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // User Profile Data
  const profileRef = React.useMemo(() => {
    if (!firestore || !user) return null
    return doc(firestore, "staff_roles", user.uid)
  }, [firestore, user])
  const { data: profile } = useDoc(profileRef)

  // School Data
  const schoolRef = React.useMemo(() => {
    if (!firestore || !profile?.schoolId) return null
    return doc(firestore, "schools", profile.schoolId)
  }, [firestore, profile])
  const { data: school } = useDoc(schoolRef)

  const [userForm, setUserForm] = React.useState({
    firstName: "",
    lastName: "",
  })

  const [schoolForm, setSchoolForm] = React.useState({
    name: "",
    cct: "",
    address: "",
    logoUrl: "",
  })

  // Sync forms when data loads
  React.useEffect(() => {
    if (profile) {
      setUserForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
      })
    }
  }, [profile])

  React.useEffect(() => {
    if (school) {
      setSchoolForm({
        name: school.name || "",
        cct: school.cct || "",
        address: school.address || "",
        logoUrl: school.logoUrl || "",
      })
    }
  }, [school])

  const handleUpdateUser = () => {
    if (!profileRef) return
    updateDocumentNonBlocking(profileRef, {
      ...userForm,
      updatedAt: serverTimestamp(),
    })
    toast({
      title: "Perfil actualizado",
      description: "Tus cambios han sido guardados correctamente.",
    })
  }

  const handleUpdateSchool = () => {
    if (!schoolRef) return
    updateDocumentNonBlocking(schoolRef, {
      ...schoolForm,
      updatedAt: serverTimestamp(),
    })
    toast({
      title: "Escuela actualizada",
      description: "La información de la institución ha sido guardada.",
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Error de archivo",
        description: "Por favor selecciona una imagen válida (PNG, JPG).",
      })
      return
    }

    if (file.size > 1024 * 1024) { // 1MB limit for Firestore base64 strings
      toast({
        variant: "destructive",
        title: "Archivo demasiado grande",
        description: "El logo debe ser menor a 1MB para un rendimiento óptimo.",
      })
      return
    }

    setIsUploading(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64String = event.target?.result as string
      setSchoolForm(prev => ({ ...prev, logoUrl: base64String }))
      setIsUploading(false)
      toast({
        title: "Logo cargado",
        description: "Presiona 'Guardar Cambios' para aplicar permanentemente.",
      })
    }
    reader.onerror = () => {
      setIsUploading(false)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo leer el archivo.",
      })
    }
    reader.readAsDataURL(file)
  }

  const removeLogo = () => {
    setSchoolForm(prev => ({ ...prev, logoUrl: "" }))
  }

  if (!mounted) return null

  const isAdmin = profile?.role === "Administrador"

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-headline font-bold text-primary">Configuración</h2>
        <p className="text-muted-foreground">Administra tu perfil y los detalles de tu institución.</p>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
          <TabsTrigger value="perfil" className="gap-2">
            <User className="h-4 w-4" /> Mi Perfil
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="escuela" className="gap-2">
              <School className="h-4 w-4" /> Mi Escuela
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="perfil">
          <Card className="border-none shadow-md max-w-2xl">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-primary" /> Datos Personales
              </CardTitle>
              <CardDescription>Esta información es visible para otros miembros de tu escuela.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6 pb-6 border-b">
                <Avatar className="h-20 w-20 border-2 border-primary/10">
                  <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/80/80`} />
                  <AvatarFallback>{profile?.firstName?.[0] || user?.email?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-lg">{profile?.firstName} {profile?.lastName}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  <div className="mt-2">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold uppercase">
                      {profile?.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre(s)</Label>
                  <Input 
                    value={userForm.firstName}
                    onChange={(e) => setUserForm({...userForm, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apellidos</Label>
                  <Input 
                    value={userForm.lastName}
                    onChange={(e) => setUserForm({...userForm, lastName: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Correo Electrónico (Solo lectura)</Label>
                <Input value={profile?.email || ""} disabled />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t pt-6">
              <Button onClick={handleUpdateUser} className="gap-2">
                <Save className="h-4 w-4" /> Guardar Perfil
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="escuela">
            <Card className="border-none shadow-md max-w-2xl">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Identidad Institucional
                </CardTitle>
                <CardDescription>Configura los datos oficiales y el logotipo de tu plantel.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-muted/5 group relative overflow-hidden min-h-[200px]">
                  {schoolForm.logoUrl ? (
                    <div className="relative">
                      <img src={schoolForm.logoUrl} alt="Logo de la escuela" className="h-32 w-auto object-contain mb-4 rounded-md shadow-sm" />
                      <button 
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full shadow-md hover:scale-110 transition-transform"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <School className="h-16 w-16 text-muted-foreground/30 mb-4" />
                      <p className="text-sm font-medium">Sin Logotipo</p>
                    </div>
                  )}
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 gap-2"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    {schoolForm.logoUrl ? "Cambiar Logo" : "Subir Logo"}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre de la Institución</Label>
                    <Input 
                      placeholder="Ej. Instituto Mexicano de Ciencias"
                      value={schoolForm.name}
                      onChange={(e) => setSchoolForm({...schoolForm, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Dirección de la Institución</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Ej. Av. Insurgentes Sur 1234, CDMX"
                        className="pl-9"
                        value={schoolForm.address}
                        onChange={(e) => setSchoolForm({...schoolForm, address: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>CCT (Clave de Centro de Trabajo)</Label>
                      <Input 
                        placeholder="Ej. 09DPR1234X"
                        value={schoolForm.cct}
                        onChange={(e) => setSchoolForm({...schoolForm, cct: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Código de Activación (Solo lectura)</Label>
                      <Input value={school?.activationCode || ""} disabled className="font-mono" />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/10 border-t pt-6">
                <Button onClick={handleUpdateSchool} className="gap-2" disabled={isUploading}>
                  <Save className="h-4 w-4" /> Guardar Cambios Institucionales
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

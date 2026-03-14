
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, ShieldCheck, Users, UserCircle, ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import { useAuth, useFirestore } from "@/firebase"
import { doc, collection, query, where, getDocs, limit, serverTimestamp, setDoc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Role = "Administrador" | "Academico" | "Alumno"

export default function RegisterPage() {
  const { auth } = useAuth()
  const { firestore } = useFirestore()
  const router = useRouter()

  const [mounted, setMounted] = React.useState(false)
  const [step, setStep] = React.useState<"role" | "activation" | "form">("role")
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [schoolInfo, setSchoolInfo] = React.useState<{ id: string, name: string } | null>(null)

  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    schoolName: "",
    activationCode: "",
    studentIdNumber: ""
  })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const mapAuthError = (code: string) => {
    switch (code) {
      case "auth/invalid-email":
        return "El formato del correo electrónico no es válido (ejemplo: usuario@escuela.com)."
      case "auth/email-already-in-use":
        return "Este correo ya está registrado en el sistema."
      case "auth/weak-password":
        return "La contraseña es muy débil. Debe tener al menos 6 caracteres."
      case "auth/network-request-failed":
        return "Error de conexión. Revisa tu internet."
      default:
        return "Ocurrió un error inesperado al crear tu cuenta."
    }
  }

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role)
    if (role === "Administrador") {
      setStep("form")
    } else {
      setStep("activation")
    }
  }

  const handleCheckCode = async () => {
    if (!firestore || !formData.activationCode) return
    setLoading(true)
    
    try {
      const schoolsRef = collection(firestore, "schools")
      const q = query(schoolsRef, where("activationCode", "==", formData.activationCode.trim()), limit(1))
      const querySnapshot = await getDocs(q)
      
      if (!querySnapshot.empty) {
        const schoolDoc = querySnapshot.docs[0]
        const data = schoolDoc.data()
        setSchoolInfo({ id: schoolDoc.id, name: data.name })
        setStep("form")
        toast({
          title: "Código válido",
          description: `Te unirás a: ${data.name}`,
        })
      } else {
        toast({
          variant: "destructive",
          title: "Código inválido",
          description: "No se encontró ninguna escuela con ese código.",
        })
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error de verificación",
        description: "Hubo un problema al validar el código.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || !firestore || !selectedRole) return

    // Client-side validations
    if (!validateEmail(formData.email)) {
      toast({
        variant: "destructive",
        title: "Correo Inválido",
        description: "Por favor ingresa un correo electrónico válido (ejemplo: usuario@dominio.com).",
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Contraseña corta",
        description: "La contraseña debe tener al menos 6 caracteres.",
      })
      return
    }

    setLoading(true)
    
    try {
      // 1. Create User
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      const finalSchoolId = schoolInfo?.id || "school-" + Math.random().toString(36).substring(7)
      const schoolActivationCode = Math.random().toString(36).substring(7).toUpperCase()

      // 2. Create School if Administrator
      if (selectedRole === "Administrador") {
        const schoolRef = doc(firestore, "schools", finalSchoolId)
        await setDoc(schoolRef, {
          id: finalSchoolId,
          name: formData.schoolName || "Nueva Escuela",
          activationCode: schoolActivationCode,
          directorId: user.uid,
          createdAt: serverTimestamp()
        }, { merge: true })
      }

      // 3. Create Profile
      const profileRef = doc(firestore, "staff_roles", user.uid)
      await setDoc(profileRef, {
        role: selectedRole,
        schoolId: finalSchoolId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: user.email,
        uid: user.uid,
        studentIdNumber: selectedRole === "Alumno" ? formData.studentIdNumber : null,
        createdAt: serverTimestamp()
      }, { merge: true })

      toast({
        title: "¡Registro exitoso!",
        description: "Configuración completada correctamente.",
      })
      
      router.push("/dashboard")

    } catch (err: any) {
      console.error("Registration error:", err)
      toast({
        variant: "destructive",
        title: "Error de Registro",
        description: mapAuthError(err.code),
      })
    } finally {
      setLoading(false)
    }
  }

  const isConfigInvalid = !auth || !firestore || auth.app.options.projectId === 'dummy';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="w-full max-w-[500px] space-y-6">
        
        {isConfigInvalid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Servicios No Disponibles</AlertTitle>
            <AlertDescription>
              Configuración de Firebase inválida. Verifica tu entorno.
            </AlertDescription>
          </Alert>
        )}

        {step !== "role" && !loading && (
          <Button variant="ghost" className="gap-2" onClick={() => setStep(step === "form" && selectedRole !== "Administrador" ? "activation" : "role")}>
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        )}

        {step === "role" && (
          <Card className="border-none shadow-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <GraduationCap className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-3xl font-headline font-bold">Únete a la Plataforma</CardTitle>
              <CardDescription>Selecciona tu función para comenzar</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <RoleButton 
                icon={<ShieldCheck className="h-8 w-8" />} 
                title="Directivo / Administrador" 
                description="Registra tu escuela y gestiona todo el plantel" 
                onClick={() => handleSelectRole("Administrador")} 
              />
              <RoleButton 
                icon={<Users className="h-8 w-8" />} 
                title="Profesor / Académico" 
                description="Accede a tus clases con un código de escuela" 
                onClick={() => handleSelectRole("Academico")} 
              />
              <RoleButton 
                icon={<UserCircle className="h-8 w-8" />} 
                title="Alumno" 
                description="Consulta tus pagos y horarios con tu código" 
                onClick={() => handleSelectRole("Alumno")} 
              />
            </CardContent>
          </Card>
        )}

        {step === "activation" && (
          <Card className="border-none shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-headline font-bold">Código de Activación</CardTitle>
              <CardDescription>Pregunta por el código a tu escuela para unirte.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Introduce el Código</Label>
                <Input 
                  placeholder="Ej. AB123X" 
                  className="h-12 text-center text-xl font-bold uppercase tracking-widest"
                  value={formData.activationCode}
                  onChange={(e) => setFormData({...formData, activationCode: e.target.value.toUpperCase()})}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full h-11" disabled={!formData.activationCode || loading} onClick={handleCheckCode}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verificar Código"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === "form" && (
          <Card className="border-none shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">Crea tu Cuenta</CardTitle>
              <CardDescription>
                {selectedRole === "Administrador" ? "Configura tu nueva institución" : `Uniéndote a: ${schoolInfo?.name}`}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4">
                {selectedRole === "Administrador" && (
                  <div className="space-y-2">
                    <Label>Nombre de la Escuela</Label>
                    <Input required placeholder="Ej. Instituto Mexicano" value={formData.schoolName} onChange={(e) => setFormData({...formData, schoolName: e.target.value})} />
                  </div>
                )}
                {selectedRole === "Alumno" && (
                  <div className="space-y-2">
                    <Label>Matrícula / ID de Estudiante</Label>
                    <Input required placeholder="Ej. CL3-P0034" value={formData.studentIdNumber} onChange={(e) => setFormData({...formData, studentIdNumber: e.target.value})} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre(s)</Label>
                    <Input required placeholder="Juan" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellidos</Label>
                    <Input required placeholder="Pérez" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Correo Electrónico</Label>
                  <Input type="email" required placeholder="tu@email.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña</Label>
                  <Input type="password" required placeholder="Mínimo 6 caracteres" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full h-11 text-lg font-bold" type="submit" disabled={loading || isConfigInvalid}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Finalizar Registro"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  )
}

function RoleButton({ icon, title, description, onClick }: { icon: any, title: string, description: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-4 p-4 border-2 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all text-left group"
    >
      <div className="p-3 rounded-xl bg-muted group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
        {icon}
      </div>
      <div>
        <p className="font-bold text-lg leading-tight mb-1">{title}</p>
        <p className="text-sm text-muted-foreground leading-snug">{description}</p>
      </div>
    </button>
  )
}


"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, ShieldCheck, Users, UserCircle, ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import { useAuth, useFirestore, setDocumentNonBlocking, initiateAnonymousSignIn, useUser } from "@/firebase"
import { doc, collection, query, where, getDocs, limit } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Role = "Administrador" | "Academico" | "Alumno"

export default function RegisterPage() {
  const { auth } = useAuth()
  const { firestore } = useFirestore()
  const { user: currentUser } = useUser()
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
    studentIdNumber: "" // Importante para alumnos
  })

  React.useEffect(() => {
    setMounted(true)
    if (auth && !currentUser) {
      initiateAnonymousSignIn(auth)
    }
  }, [auth, currentUser])

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
          description: "No se encontró ninguna escuela con ese código. Por favor verifica con tu administración.",
        })
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error de verificación",
        description: "Hubo un problema al validar el código. Reintenta.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!auth || !firestore || !selectedRole) return

    setLoading(true)
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      const finalSchoolId = schoolInfo?.id || "school-" + Math.random().toString(36).substring(7)
      const schoolActivationCode = Math.random().toString(36).substring(7).toUpperCase()

      if (selectedRole === "Administrador") {
        const schoolRef = doc(firestore, "schools", finalSchoolId)
        setDocumentNonBlocking(schoolRef, {
          id: finalSchoolId,
          name: formData.schoolName || "Nueva Escuela",
          activationCode: schoolActivationCode,
          directorId: user.uid,
          createdAt: new Date().toISOString()
        }, { merge: true })
      }

      const profileRef = doc(firestore, "staff_roles", user.uid)
      setDocumentNonBlocking(profileRef, {
        role: selectedRole,
        schoolId: finalSchoolId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: user.email,
        uid: user.uid,
        studentIdNumber: selectedRole === "Alumno" ? formData.studentIdNumber : null,
        createdAt: new Date().toISOString()
      }, { merge: true })

      toast({
        title: "¡Configuración completada!",
        description: selectedRole === "Administrador" 
          ? `Bienvenido. Tu código de activación es: ${schoolActivationCode}`
          : "Te has unido exitosamente a la escuela.",
      })
      
      router.push("/dashboard")

    } catch (err: any) {
      setLoading(false)
      toast({
        variant: "destructive",
        title: "Error de Registro",
        description: err.message || "No se pudo crear la cuenta. Revisa tus datos.",
      })
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
              Firebase no se ha inicializado correctamente. Revisa tus variables .env y reinicia el servidor.
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
                    <Input required placeholder="Ej. Instituto Mexicano de Ciencias" value={formData.schoolName} onChange={(e) => setFormData({...formData, schoolName: e.target.value})} />
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

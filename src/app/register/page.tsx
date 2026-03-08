
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, ShieldCheck, Users, UserCircle, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"
import { useAuth, initiateEmailSignUp, useFirestore, useUser } from "@/firebase"
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

type Role = "Administrador" | "Academico" | "Alumno"

export default function RegisterPage() {
  const { auth } = useAuth()
  const { firestore } = useFirestore()
  const { user } = useUser()
  const router = useRouter()

  const [step, setStep] = React.useState<"role" | "activation" | "form">("role")
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [schoolInfo, setSchoolInfo] = React.useState<{ id: string, name: string } | null>(null)

  // Registration form state
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    schoolName: "", // Only for Director
    activationCode: "" // Only for Professor/Student
  })

  // Handle Role Selection
  const handleSelectRole = (role: Role) => {
    setSelectedRole(role)
    if (role === "Administrador") {
      setStep("form")
    } else {
      setStep("activation")
    }
  }

  // Handle Activation Code
  const handleCheckCode = async () => {
    if (!firestore || !formData.activationCode) return
    setLoading(true)
    try {
      const q = query(collection(firestore, "schools"), where("activationCode", "==", formData.activationCode))
      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        toast({ variant: "destructive", title: "Código inválido", description: "Pregunta por el código a tu escuela." })
      } else {
        const schoolDoc = snapshot.docs[0]
        setSchoolInfo({ id: schoolDoc.id, name: schoolDoc.data().name })
        setStep("form")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || !firestore || !selectedRole) return
    setLoading(true)

    try {
      // 1. Create Auth User
      initiateEmailSignUp(auth, formData.email, formData.password)
      
      // We need to wait for the user to be created in the context
      // but since we use non-blocking, we'll listen for the user in a useEffect
      // or just wait for the auth process to finish if we were using await.
      // FOR THE SAKE OF THIS FLOW, we'll use a listener to complete the DB part.
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear la cuenta." })
      setLoading(false)
    }
  }

  // Handle database creation after Auth is successful
  React.useEffect(() => {
    if (user && loading && selectedRole && firestore) {
      const completeRegistration = async () => {
        let finalSchoolId = schoolInfo?.id

        // Create school if Director
        if (selectedRole === "Administrador") {
          const newSchoolRef = doc(collection(firestore, "schools"))
          finalSchoolId = newSchoolRef.id
          await setDoc(newSchoolRef, {
            id: finalSchoolId,
            name: formData.schoolName,
            activationCode: Math.random().toString(36).substring(7).toUpperCase(),
            directorId: user.uid,
            createdAt: serverTimestamp()
          })
        }

        // Create Role Profile
        await setDoc(doc(firestore, "staff_roles", user.uid), {
          role: selectedRole,
          schoolId: finalSchoolId,
          firstName: formData.firstName,
          lastName: formData.lastName
        })

        toast({ title: "¡Bienvenido!", description: "Tu cuenta ha sido creada exitosamente." })
        router.push("/dashboard")
      }
      completeRegistration()
    }
  }, [user, loading, selectedRole, firestore, schoolInfo, formData, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="w-full max-w-[500px] space-y-6">
        
        {step !== "role" && (
          <Button variant="ghost" className="gap-2" onClick={() => setStep(step === "form" && selectedRole !== "Administrador" ? "activation" : "role")}>
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        )}

        {/* STEP 1: ROLE SELECTION */}
        {step === "role" && (
          <Card className="border-none shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-headline font-bold">¿Quién eres?</CardTitle>
              <CardDescription>Selecciona tu rol para comenzar el registro</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <RoleButton 
                icon={<ShieldCheck className="h-8 w-8" />} 
                title="Directivo / Administrador" 
                description="Gestione toda su escuela y finanzas" 
                onClick={() => handleSelectRole("Administrador")} 
              />
              <RoleButton 
                icon={<Users className="h-8 w-8" />} 
                title="Profesor / Académico" 
                description="Gestione sus clases y alumnos" 
                onClick={() => handleSelectRole("Academico")} 
              />
              <RoleButton 
                icon={<UserCircle className="h-8 w-8" />} 
                title="Alumno" 
                description="Acceda a sus horarios y pagos" 
                onClick={() => handleSelectRole("Alumno")} 
              />
            </CardContent>
          </Card>
        )}

        {/* STEP 2: ACTIVATION CODE (For Prof/Student) */}
        {step === "activation" && (
          <Card className="border-none shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-headline font-bold">Código de Activación</CardTitle>
              <CardDescription>Pregunta por el código a tu escuela para unirte.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Código de la Escuela</Label>
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

        {/* STEP 3: FINAL FORM */}
        {step === "form" && (
          <Card className="border-none shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">Datos de Registro</CardTitle>
              <CardDescription>
                {selectedRole === "Administrador" ? "Configura tu nueva escuela" : `Unirse a: ${schoolInfo?.name}`}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4">
                {selectedRole === "Administrador" && (
                  <div className="space-y-2">
                    <Label>Nombre de la Escuela</Label>
                    <Input required value={formData.schoolName} onChange={(e) => setFormData({...formData, schoolName: e.target.value})} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre(s)</Label>
                    <Input required value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellidos</Label>
                    <Input required value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña</Label>
                  <Input type="password" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full h-11" type="submit" disabled={loading}>
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
      <div className="p-3 rounded-xl bg-muted group-hover:bg-primary group-hover:text-white transition-colors">
        {icon}
      </div>
      <div>
        <p className="font-bold text-lg">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  )
}

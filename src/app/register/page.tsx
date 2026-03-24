
"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GraduationCap, ShieldCheck, Users, UserCircle, ArrowLeft, Loader2, Sparkles, CreditCard } from "lucide-react"
import { useAuth, useFirestore } from "@/firebase"
import { doc, collection, query, where, getDocs, limit, serverTimestamp, setDoc, Timestamp } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { createUserWithEmailAndPassword } from "firebase/auth"

type Role = "Administrador" | "Academico" | "Alumno"
type Plan = "basico" | "profesional" | "institucional"

const PLAN_LABELS: Record<Plan, string> = {
  basico: "Básico",
  profesional: "Profesional",
  institucional: "Institucional",
}

const PLAN_PRICES: Record<Plan, string> = {
  basico: "Prueba gratuita 7 días, luego $499/mes",
  profesional: "$999/mes — pago mensual",
  institucional: "$1,999/mes — pago mensual",
}

// Outer page — needs Suspense for useSearchParams
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  )
}

function RegisterPageContent() {
  const { auth } = useAuth()
  const { firestore } = useFirestore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = searchParams.get("plan") as Plan | null

  const [mounted, setMounted] = React.useState(false)
  const [step, setStep] = React.useState<"role" | "activation" | "form">("role")
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [schoolInfo, setSchoolInfo] = React.useState<{ id: string; name: string } | null>(null)

  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    schoolName: "",
    activationCode: "",
    studentIdNumber: "",
  })

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const mapAuthError = (code: string) => {
    switch (code) {
      case "auth/invalid-email":
        return "El formato del correo electrónico no es válido."
      case "auth/email-already-in-use":
        return "Este correo ya está registrado en el sistema."
      case "auth/weak-password":
        return "La contraseña es muy débil (mínimo 6 caracteres)."
      default:
        return "Ocurrió un error inesperado al crear tu cuenta."
    }
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
      const q = query(
        schoolsRef,
        where("activationCode", "==", formData.activationCode.trim().toUpperCase()),
        limit(1)
      )
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const schoolDoc = querySnapshot.docs[0]
        const data = schoolDoc.data()
        setSchoolInfo({ id: schoolDoc.id, name: data.name })
        setStep("form")
        toast({ title: "Código Verificado", description: `Institución encontrada: ${data.name}` })
      } else {
        toast({
          variant: "destructive",
          title: "Código Inválido",
          description: "No se encontró ninguna escuela vinculada a este código.",
        })
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error de Red",
        description: "No se pudo verificar el código en este momento.",
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
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      let finalSchoolId = schoolInfo?.id

      // 2. If Administrator, create the school
      if (selectedRole === "Administrador") {
        const newSchoolRef = doc(collection(firestore, "schools"))
        finalSchoolId = newSchoolRef.id
        const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase()

        const plan = planParam || "basico"
        const isFreeTrial = plan === "basico"

        // Trial ends 7 days from now
        const trialEndsAt = isFreeTrial
          ? Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
          : null

        await setDoc(newSchoolRef, {
          id: finalSchoolId,
          name: formData.schoolName || "Nueva Escuela",
          activationCode: generatedCode,
          directorId: user.uid,
          plan,
          subscriptionStatus: isFreeTrial ? "trial" : "pending_payment",
          ...(trialEndsAt ? { trialEndsAt } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })

        // 3a. For paid plans → redirect to Stripe subscription checkout
        if (!isFreeTrial) {
          // Create staff_roles before redirecting
          const profileRef = doc(firestore, "staff_roles", user.uid)
          await setDoc(profileRef, {
            role: selectedRole,
            schoolId: finalSchoolId,
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: user.email,
            uid: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })

          // Call Stripe subscription API
          const res = await fetch("/api/stripe/subscription", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              schoolId: finalSchoolId,
              plan,
              schoolName: formData.schoolName,
              email: formData.email,
            }),
          })
          const data = await res.json()

          if (data.url) {
            // Redirect to Stripe Checkout
            window.location.href = data.url
            return
          } else {
            throw new Error(data.error || "No se pudo iniciar el proceso de pago.")
          }
        }
      }

      if (!finalSchoolId) throw new Error("No school ID found")

      // 3b. Create Staff/Student Role Profile (for free trial and non-admin users)
      const profileRef = doc(firestore, "staff_roles", user.uid)
      await setDoc(profileRef, {
        role: selectedRole,
        schoolId: finalSchoolId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: user.email,
        uid: user.uid,
        studentIdNumber: selectedRole === "Alumno" ? formData.studentIdNumber : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast({ title: "¡Bienvenido!", description: "Tu cuenta ha sido creada exitosamente." })
      router.push("/dashboard")
    } catch (err: any) {
      console.error("Registration error:", err)
      toast({
        variant: "destructive",
        title: "Error de Registro",
        description: err.message || mapAuthError(err.code),
      })
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  const isAdminWithPaidPlan =
    selectedRole === "Administrador" && planParam && planParam !== "basico"

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="w-full max-w-[500px] space-y-6">
        {/* Plan banner — shown when coming from /plans */}
        {planParam && step !== "activation" && (
          <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-bold text-sm">
                Plan seleccionado:{" "}
                <Badge variant="secondary" className="ml-1">
                  {PLAN_LABELS[planParam]}
                </Badge>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{PLAN_PRICES[planParam]}</p>
            </div>
          </div>
        )}

        {step !== "role" && (
          <Button
            variant="ghost"
            className="gap-2 mb-2"
            onClick={() =>
              setStep(
                step === "form" && selectedRole !== "Administrador" ? "activation" : "role"
              )
            }
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        )}

        {step === "role" && (
          <Card className="border-none shadow-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <GraduationCap className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-3xl font-headline font-bold">Registro de Usuario</CardTitle>
              <CardDescription>Selecciona tu perfil para continuar</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <RoleButton
                icon={<ShieldCheck className="h-8 w-8" />}
                title="Directivo / Administrador"
                description="Registra una nueva institución y gestiona el plantel"
                onClick={() => handleSelectRole("Administrador")}
              />
              <RoleButton
                icon={<Users className="h-8 w-8" />}
                title="Personal Académico"
                description="Únete a una escuela existente con tu código de acceso"
                onClick={() => handleSelectRole("Academico")}
              />
              <RoleButton
                icon={<UserCircle className="h-8 w-8" />}
                title="Alumno"
                description="Consulta tus calificaciones y pagos institucionales"
                onClick={() => handleSelectRole("Alumno")}
              />
            </CardContent>
          </Card>
        )}

        {step === "activation" && (
          <Card className="border-none shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-headline font-bold">Código de Activación</CardTitle>
              <CardDescription>Ingresa el código proporcionado por tu escuela.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Código Escolar</Label>
                <Input
                  placeholder="Ej. XM92JK"
                  className="h-12 text-center text-xl font-bold uppercase tracking-widest"
                  value={formData.activationCode}
                  onChange={(e) => setFormData({ ...formData, activationCode: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full h-11"
                disabled={!formData.activationCode || loading}
                onClick={handleCheckCode}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verificar Código"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === "form" && (
          <Card className="border-none shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">Datos de la Cuenta</CardTitle>
              <CardDescription>
                {selectedRole === "Administrador"
                  ? "Configura tu nueva institución"
                  : `Vinculando con: ${schoolInfo?.name}`}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4">
                {selectedRole === "Administrador" && (
                  <div className="space-y-2">
                    <Label>Nombre de la Escuela</Label>
                    <Input
                      required
                      placeholder="Ej. Instituto Mexicano"
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    />
                  </div>
                )}
                {selectedRole === "Alumno" && (
                  <div className="space-y-2">
                    <Label>Matrícula / ID de Estudiante</Label>
                    <Input
                      required
                      placeholder="Ej. 2024-001"
                      value={formData.studentIdNumber}
                      onChange={(e) => setFormData({ ...formData, studentIdNumber: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Esta matrícula debe coincidir con la registrada en la administración.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre(s)</Label>
                    <Input
                      required
                      placeholder="Nombres"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellidos</Label>
                    <Input
                      required
                      placeholder="Apellidos"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Correo Electrónico</Label>
                  <Input
                    type="email"
                    required
                    placeholder="correo@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contraseña</Label>
                  <Input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button className="w-full h-11 text-lg font-bold" type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isAdminWithPaidPlan ? (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Continuar al Pago
                    </>
                  ) : planParam === "basico" && selectedRole === "Administrador" ? (
                    "Comenzar Prueba Gratuita"
                  ) : (
                    "Finalizar Registro"
                  )}
                </Button>
                {isAdminWithPaidPlan && (
                  <p className="text-xs text-muted-foreground text-center">
                    Serás redirigido a Stripe para completar el pago de forma segura.
                  </p>
                )}
                {planParam === "basico" && selectedRole === "Administrador" && (
                  <p className="text-xs text-muted-foreground text-center">
                    7 días gratis, sin tarjeta requerida. Después: $499/mes.
                  </p>
                )}
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  )
}

function RoleButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
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

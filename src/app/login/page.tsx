
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Loader2 } from "lucide-react"
import { useAuth, useUser } from "@/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"
import { toast } from "@/hooks/use-toast"

export default function LoginPage() {
  const { auth } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const [mounted, setMounted] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    if (user) router.push("/dashboard")
  }, [user, router])

  const mapAuthError = (code: string) => {
    switch (code) {
      case "auth/invalid-email":
        return "El correo electrónico ingresado no tiene un formato válido."
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "El correo o la contraseña son incorrectos."
      case "auth/too-many-requests":
        return "Demasiados intentos fallidos. Por favor, intenta más tarde."
      default:
        return "Ocurrió un error al intentar iniciar sesión."
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!auth) return

    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast({
        title: "Sesión iniciada",
        description: "Bienvenido de nuevo.",
      })
    } catch (error: any) {
      console.error("Login error:", error)
      setLoading(false)
      toast({
        variant: "destructive",
        title: "Error de acceso",
        description: mapAuthError(error.code),
      })
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const isConfigInvalid = !auth || auth.app.options.projectId === 'dummy';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-gradient-to-br from-primary/5 to-accent/5">
      <Card className="w-full max-w-[400px] border-none shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Logos.GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-headline font-bold">Escuela Digital MX</CardTitle>
          <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" name="email" type="email" placeholder="ejemplo@escuela.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full h-11 text-lg font-bold" disabled={loading || isConfigInvalid}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar al Sistema"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              ¿Eres nuevo?{" "}
              <Link href="/register" className="text-primary font-bold hover:underline">
                Crea tu cuenta aquí
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

const Logos = {
  GraduationCap
}

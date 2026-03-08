
"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GraduationCap, ShieldCheck, CreditCard, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <Link className="flex items-center justify-center gap-2" href="#">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-headline font-bold text-xl text-primary">Escuela Digital MX</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="/login">
            Iniciar Sesión
          </Link>
          <Link href="/register">
            <Button size="sm">Registrarse</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-primary/5 to-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-headline font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  La Gestión Escolar del Futuro, <span className="text-primary">Hoy.</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Administración, finanzas y comunicación en una sola plataforma SaaS potente para escuelas modernas en México.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/register">
                  <Button size="lg" className="px-8 h-12 text-lg gap-2">
                    Comenzar Ahora <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button variant="outline" size="lg" className="px-8 h-12 text-lg">
                    Saber Más
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 border-t">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 p-6 rounded-2xl bg-muted/30">
                <ShieldCheck className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold font-headline">Control de Accesos</h3>
                <p className="text-center text-muted-foreground">
                  Roles específicos para Directores, Profesores y Alumnos con seguridad de grado bancario.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 p-6 rounded-2xl bg-muted/30">
                <CreditCard className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold font-headline">Finanzas Automatizadas</h3>
                <p className="text-center text-muted-foreground">
                  Cobranza, gestión de becas y reportes financieros detallados en tiempo real.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 p-6 rounded-2xl bg-muted/30">
                <Sparkles className="h-12 w-12 text-primary" />
                <h3 className="text-xl font-bold font-headline">Asistente IA</h3>
                <p className="text-center text-muted-foreground">
                  Generación de reportes y comunicaciones para padres mediante inteligencia artificial.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <h2 className="text-3xl font-headline font-bold mb-12">¿Por qué elegirnos?</h2>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                "Multi-plantel nativo",
                "Integración WhatsApp",
                "App para Alumnos",
                "Soporte 24/7",
                "Reportes SEP automáticos",
                "Seguridad Firestore"
              ].map((text) => (
                <div key={text} className="flex items-center justify-center gap-2 text-lg">
                  <CheckCircle2 className="h-6 w-6 text-accent" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">© 2024 Escuela Digital MX. Todos los derechos reservados.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">Términos de Servicio</Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">Privacidad</Link>
        </nav>
      </footer>
    </div>
  )
}

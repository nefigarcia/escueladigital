
"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GraduationCap, ShieldCheck, CreditCard, Sparkles, ArrowRight, CheckCircle2, Brain } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

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
          <Link className="text-sm font-medium hover:text-primary transition-colors flex items-center" href="/login">
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
                  Administración, finanzas y psicología en una sola plataforma SaaS potente para escuelas modernas en México.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/register">
                  <Button size="lg" className="px-8 h-12 text-lg gap-2">
                    Comenzar Ahora <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#pricing">
                  <Button variant="outline" size="lg" className="px-8 h-12 text-lg">
                    Ver Planes
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 border-t">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 text-center">
              <div className="flex flex-col items-center space-y-4 p-6 rounded-2xl bg-muted/30">
                <ShieldCheck className="h-10 w-10 text-primary" />
                <h3 className="text-lg font-bold font-headline">Control Total</h3>
                <p className="text-sm text-muted-foreground">
                  Roles específicos para Directores, Profesores y Alumnos con seguridad máxima.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 p-6 rounded-2xl bg-muted/30">
                <CreditCard className="h-10 w-10 text-primary" />
                <h3 className="text-lg font-bold font-headline">Finanzas IA</h3>
                <p className="text-sm text-muted-foreground">
                  Cobranza automatizada y generación de recibos PDF institucionales.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 p-6 rounded-2xl bg-muted/30">
                <Brain className="h-10 w-10 text-primary" />
                <h3 className="text-lg font-bold font-headline">Psicología Educativa</h3>
                <p className="text-sm text-muted-foreground">
                  Asistente IA para la redacción de reportes conductuales y psicopedagógicos.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 p-6 rounded-2xl bg-muted/30">
                <Sparkles className="h-10 w-10 text-primary" />
                <h3 className="text-lg font-bold font-headline">Comunicación IA</h3>
                <p className="text-sm text-muted-foreground">
                  Redacción inteligente de avisos para padres vía WhatsApp y Correo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-muted/20">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-headline font-bold tracking-tighter sm:text-5xl">Planes y Precios</h2>
              <p className="max-w-[700px] text-muted-foreground">Elige el plan que mejor se adapte al tamaño de tu institución.</p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3">
              {/* Basic Plan */}
              <Card className="flex flex-col border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">Básico</CardTitle>
                  <CardDescription>Ideal para preescolares y estancias pequeñas.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-4">
                    <span className="text-4xl font-bold">$499</span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Hasta 100 alumnos</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Gestión de pagos básica</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Horarios y Asistencia</li>
                    <li className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 opacity-20" /> Asistente IA (Limitado)</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline">Comenzar Gratis</Button>
                </CardFooter>
              </Card>

              {/* Pro Plan */}
              <Card className="flex flex-col border-2 border-primary shadow-2xl relative">
                <div className="absolute top-0 right-0 bg-primary text-white px-3 py-1 rounded-bl-lg text-[10px] font-bold uppercase tracking-widest">Recomendado</div>
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">Profesional</CardTitle>
                  <CardDescription>Gestión completa con Inteligencia Artificial.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-4">
                    <span className="text-4xl font-bold">$999</span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Hasta 500 alumnos</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Asistente IA de Comunicación</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Módulo de Psicología con IA</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Recibos PDF ilimitados</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Seleccionar Plan Pro</Button>
                </CardFooter>
              </Card>

              {/* Enterprise Plan */}
              <Card className="flex flex-col border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">Institucional</CardTitle>
                  <CardDescription>Para redes de escuelas y grandes planteles.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-4">
                    <span className="text-4xl font-bold">$1,999</span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Alumnos ilimitados</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Soporte prioritario 24/7</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Multi-plantel y Auditoría</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Personalización total (White label)</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline">Contactar Ventas</Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <h2 className="text-3xl font-headline font-bold mb-12">Potenciando la Educación en México</h2>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                "Seguridad Firestore",
                "Integración WhatsApp",
                "App para Alumnos",
                "Soporte Local",
                "Reportes IA Automáticos",
                "Nube Distribuida"
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

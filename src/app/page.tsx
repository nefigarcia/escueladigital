"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { GraduationCap, ShieldCheck, CreditCard, Sparkles, ArrowRight, CheckCircle2, Brain } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

function FeatureCard({
  icon,
  title,
  desc,
  index,
  iconAnimClass,
  iconBgClass,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  index: number
  iconAnimClass: string
  iconBgClass: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${index * 120}ms` }}
      className={`flex flex-col items-center space-y-4 p-6 rounded-2xl bg-muted/30
        hover:bg-muted/50 hover:-translate-y-2 hover:shadow-xl
        transition-all duration-500 group cursor-default
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
    >
      {/* Icon bubble */}
      <div className={`p-3 rounded-full transition-colors duration-300 ${iconBgClass}`}>
        <div className={iconAnimClass}>{icon}</div>
      </div>
      <h3 className="text-lg font-bold font-headline">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}

function ScrollVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Preload metadata so duration is available immediately
    video.preload = "auto"
    video.muted = true
    video.playsInline = true
    video.pause()

    const handleScroll = () => {
      const section = sectionRef.current
      if (!video || !section || !video.duration) return

      const sectionTop = section.offsetTop
      const sectionHeight = section.offsetHeight
      const viewportHeight = window.innerHeight

      // Progress from 0 (video start) to 1 (video end) as section scrolls past
      const scrolled = window.scrollY - sectionTop
      const scrollable = sectionHeight - viewportHeight
      const progress = Math.max(0, Math.min(1, scrolled / scrollable))

      video.currentTime = progress * video.duration
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    // Run once on mount in case user is mid-page on refresh
    handleScroll()

    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    /* Tall section gives scroll "room" — sticky video stays in view */
    <section
      ref={sectionRef}
      className="relative h-[400vh] bg-gradient-to-b from-white to-primary/5"
    >
      {/* Sticky container */}
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden">
        {/* Label */}
        <p className="absolute top-6 left-1/2 -translate-x-1/2 z-10 text-sm font-medium text-primary/70 tracking-widest uppercase">
          Un día en Escuela Digital
        </p>

        {/* Video — fills most of the viewport on every screen size */}
        <video
          ref={videoRef}
          src="/videos/Animated_School_Day_STEM_Fun.mp4"
          className="w-full max-w-5xl rounded-2xl shadow-2xl object-cover
                     h-[55vw] max-h-[80vh] min-h-[200px]"
          muted
          playsInline
          preload="auto"
        />

        {/* Scroll cue — fades out after user starts scrolling via CSS */}
        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-xs text-muted-foreground animate-bounce">
          ↓ Desplázate para ver la acción
        </p>
      </div>
    </section>
  )
}

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* ── Header ── */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <Link className="flex items-center justify-center gap-2" href="#">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-headline font-bold text-lg sm:text-xl text-primary">
            Escuela Digital MX
          </span>
        </Link>
        <nav className="ml-auto flex gap-3 sm:gap-6 items-center">
          <Link
            className="text-sm font-medium hover:text-primary transition-colors hidden sm:inline-flex items-center"
            href="/login"
          >
            Iniciar Sesión
          </Link>
          <Link href="/login" className="sm:hidden">
            <Button variant="ghost" size="sm">Entrar</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Registrarse</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="w-full py-16 md:py-28 lg:py-36 bg-gradient-to-b from-primary/5 to-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="space-y-3 max-w-3xl">
                <h1 className="text-3xl font-headline font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl leading-tight">
                  La Gestión Escolar del Futuro,{" "}
                  <span className="text-primary">Hoy.</span>
                </h1>
                <p className="mx-auto max-w-[680px] text-muted-foreground text-base md:text-xl">
                  Administración, finanzas y psicología en una sola plataforma SaaS potente
                  para escuelas modernas en México.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto px-8 h-12 text-base sm:text-lg gap-2">
                    Comenzar Ahora <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#pricing" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 h-12 text-base sm:text-lg">
                    Ver Planes
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Scroll-driven Video ── */}
        <ScrollVideo />

        {/* ── Features ── */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 border-t">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-headline font-bold tracking-tighter sm:text-4xl">
                Todo lo que necesitas
              </h2>
              <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
                Una plataforma completa para que directores, docentes y alumnos trabajen en sincronía.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-center">
              {[
                {
                  icon: <ShieldCheck className="h-10 w-10 text-primary" />,
                  title: "Control Total",
                  desc: "Roles específicos para Directores, Profesores y Alumnos con seguridad máxima.",
                  iconAnimClass: "animate-icon-shield-ping",
                  iconBgClass: "bg-primary/10 group-hover:bg-primary/20",
                },
                {
                  icon: <CreditCard className="h-10 w-10 text-primary" />,
                  title: "Finanzas IA",
                  desc: "Cobranza automatizada y generación de recibos PDF institucionales.",
                  iconAnimClass: "animate-icon-card-swipe",
                  iconBgClass: "bg-emerald-500/10 group-hover:bg-emerald-500/20",
                },
                {
                  icon: <Brain className="h-10 w-10 text-primary" />,
                  title: "Psicología Educativa",
                  desc: "Asistente IA para la redacción de reportes conductuales y psicopedagógicos.",
                  iconAnimClass: "animate-icon-float",
                  iconBgClass: "bg-violet-500/10 group-hover:bg-violet-500/20",
                },
                {
                  icon: <Sparkles className="h-10 w-10 text-primary" />,
                  title: "Comunicación IA",
                  desc: "Redacción inteligente de avisos para padres vía WhatsApp y Correo.",
                  iconAnimClass: "animate-icon-sparkle",
                  iconBgClass: "bg-sky-500/10 group-hover:bg-sky-500/20",
                },
              ].map(({ icon, title, desc, iconAnimClass, iconBgClass }, i) => (
                <FeatureCard
                  key={title}
                  icon={icon}
                  title={title}
                  desc={desc}
                  index={i}
                  iconAnimClass={iconAnimClass}
                  iconBgClass={iconBgClass}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-muted/20">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-headline font-bold tracking-tighter sm:text-5xl">
                Planes y Precios
              </h2>
              <p className="max-w-[600px] text-muted-foreground text-sm sm:text-base">
                Elige el plan que mejor se adapte al tamaño de tu institución.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {/* Basic */}
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
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Hasta 100 alumnos</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Gestión de pagos básica</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Horarios y Asistencia</li>
                    <li className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4 opacity-20 shrink-0" /> Asistente IA (Limitado)</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline">Comenzar Gratis</Button>
                </CardFooter>
              </Card>

              {/* Pro */}
              <Card className="flex flex-col border-2 border-primary shadow-2xl relative">
                <div className="absolute top-0 right-0 bg-primary text-white px-3 py-1 rounded-bl-lg text-[10px] font-bold uppercase tracking-widest">
                  Recomendado
                </div>
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
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Hasta 500 alumnos</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Asistente IA de Comunicación</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Módulo de Psicología con IA</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Recibos PDF ilimitados</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Seleccionar Plan Pro</Button>
                </CardFooter>
              </Card>

              {/* Enterprise — full width on 2-col grid, centered on its own row */}
              <Card className="flex flex-col border-none shadow-lg sm:col-span-2 lg:col-span-1">
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
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Alumnos ilimitados</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Soporte prioritario 24/7</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Multi-plantel y Auditoría</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Personalización total (White label)</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline">Contactar Ventas</Button>
                </CardFooter>
            </Card>
            </div>
          </div>
        </section>

        {/* ── Social Proof ── */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-headline font-bold mb-10 sm:mb-12">
              Potenciando la Educación en México
            </h2>
            <div className="grid gap-6 grid-cols-2 md:grid-cols-3">
              {[
                "Seguridad Firestore",
                "Integración WhatsApp",
                "App para Alumnos",
                "Soporte Local",
                "Reportes IA Automáticos",
                "Nube Distribuida",
              ].map((text) => (
                <div key={text} className="flex items-center justify-center gap-2 text-sm sm:text-lg">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-accent shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground text-center sm:text-left">
          © 2024 Escuela Digital MX. Todos los derechos reservados.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Términos de Servicio
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacidad
          </Link>
        </nav>
      </footer>
    </div>
  )
}

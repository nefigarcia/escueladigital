"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, CheckCircle2, ArrowLeft, Sparkles } from "lucide-react"

const PLANS = [
  {
    id: "basico",
    name: "Básico",
    price: "$499",
    description: "Ideal para preescolares y estancias pequeñas.",
    trial: "7 días gratis, sin necesidad de tarjeta",
    ctaLabel: "Comenzar Gratis — 7 días",
    features: [
      { text: "Hasta 100 alumnos", active: true },
      { text: "Gestión de pagos básica", active: true },
      { text: "Horarios y Asistencia", active: true },
      { text: "Asistente IA (Limitado)", active: false },
    ],
    variant: "outline" as const,
    highlighted: false,
    colSpan: "",
  },
  {
    id: "profesional",
    name: "Profesional",
    price: "$999",
    description: "Gestión completa con Inteligencia Artificial.",
    trial: null,
    ctaLabel: "Seleccionar Plan Pro",
    features: [
      { text: "Hasta 500 alumnos", active: true },
      { text: "Asistente IA de Comunicación", active: true },
      { text: "Módulo de Psicología con IA", active: true },
      { text: "Recibos PDF ilimitados", active: true },
    ],
    variant: "default" as const,
    highlighted: true,
    colSpan: "",
  },
  {
    id: "institucional",
    name: "Institucional",
    price: "$1,999",
    description: "Para redes de escuelas y grandes planteles.",
    trial: null,
    ctaLabel: "Seleccionar Plan Institucional",
    features: [
      { text: "Alumnos ilimitados", active: true },
      { text: "Soporte prioritario 24/7", active: true },
      { text: "Multi-plantel y Auditoría", active: true },
      { text: "Personalización total (White label)", active: true },
    ],
    variant: "outline" as const,
    highlighted: false,
    colSpan: "sm:col-span-2 lg:col-span-1",
  },
]

export default function PlansPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <Link className="flex items-center justify-center gap-2" href="/">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-headline font-bold text-lg sm:text-xl text-primary">
            Escuela Digital MX
          </span>
        </Link>
        <nav className="ml-auto flex gap-3 sm:gap-4 items-center">
          <Link href="/" className="hidden sm:flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Inicio
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm">Iniciar Sesión</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1 py-16 md:py-24 bg-gradient-to-b from-primary/5 to-white">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col items-center space-y-4 text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              Plan Básico incluye 7 días de prueba sin tarjeta
            </div>
            <h1 className="text-3xl font-headline font-bold tracking-tighter sm:text-5xl">
              Planes y Precios
            </h1>
            <p className="max-w-[600px] text-muted-foreground text-sm sm:text-base">
              Elige el plan que mejor se adapte al tamaño de tu institución.
              Sin compromisos. Cancela cuando quieras.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={`flex flex-col shadow-lg relative ${
                  plan.highlighted ? "border-2 border-primary shadow-2xl" : "border-none"
                } ${plan.colSpan}`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 right-0 bg-primary text-white px-3 py-1 rounded-bl-lg text-[10px] font-bold uppercase tracking-widest">
                    Recomendado
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                  {plan.trial && (
                    <div className="mb-4 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-semibold">
                      ✓ {plan.trial}
                    </div>
                  )}
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li
                        key={feature.text}
                        className={`flex items-center gap-2 ${!feature.active ? "text-muted-foreground" : ""}`}
                      >
                        <CheckCircle2
                          className={`h-4 w-4 shrink-0 ${feature.active ? "text-emerald-500" : "opacity-20"}`}
                        />
                        {feature.text}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href={`/register?plan=${plan.id}`} className="w-full">
                    <Button className="w-full" variant={plan.variant}>
                      {plan.ctaLabel}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="mt-16 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Pagos procesados de forma segura por <strong>Stripe</strong> · Cancela en cualquier momento
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
              <span>🔒 Cifrado SSL 256-bit</span>
              <span>💳 Tarjeta, OXXO o Transferencia Bancaria</span>
              <span>🇲🇽 Precios en pesos mexicanos (MXN)</span>
              <span>📞 Soporte en español</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t text-center text-xs text-muted-foreground">
        © 2024 Escuela Digital MX. Todos los derechos reservados.
      </footer>
    </div>
  )
}

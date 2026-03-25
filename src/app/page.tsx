"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { GraduationCap, ArrowDown, ArrowRight } from "lucide-react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Lenis from "lenis"

const FRAME_COUNT = 192
const FRAME_SPEED = 2.0
const IMAGE_SCALE = 0.85

const SECTIONS = [
  {
    id: "control",
    align: "left" as const,
    enter: 8,
    leave: 25,
    animation: "slide-left",
    label: "001 / Seguridad",
    heading: "Control Total",
    body: "Roles específicos para Directores, Profesores y Alumnos. Acceso granular con seguridad Firestore de nivel empresarial.",
    persist: false,
  },
  {
    id: "finanzas",
    align: "right" as const,
    enter: 25,
    leave: 42,
    animation: "slide-right",
    label: "002 / Finanzas",
    heading: "Finanzas con IA",
    body: "Cobranza automatizada, generación de recibos PDF y reportes financieros en tiempo real.",
    persist: false,
  },
  {
    id: "psicologia",
    align: "left" as const,
    enter: 42,
    leave: 57,
    animation: "scale-up",
    label: "003 / Psicología",
    heading: "Psicología Educativa",
    body: "Asistente IA para redacción de reportes conductuales y psicopedagógicos. Documentación precisa en segundos.",
    persist: false,
  },
  {
    id: "comunicacion",
    align: "right" as const,
    enter: 72,
    leave: 86,
    animation: "rotate-in",
    label: "004 / Comunicación",
    heading: "Comunicación IA",
    body: "Redacción inteligente de avisos para padres vía WhatsApp y Correo electrónico.",
    persist: false,
  },
  {
    id: "cta",
    align: "left" as const,
    enter: 86,
    leave: 100,
    animation: "clip-reveal",
    label: "Comienza Hoy",
    heading: "El futuro de tu\nescuela empieza aquí.",
    body: "Prueba gratuita de 7 días. Sin tarjeta de crédito. Configuración en minutos.",
    persist: true,
  },
]

const STATS = [
  { value: 500, suffix: "+", label: "Escuelas activas" },
  { value: 50000, suffix: "+", label: "Alumnos gestionados" },
  { value: 1000000, suffix: "+", label: "Recibos generados" },
]

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const darkOverlayRef = useRef<HTMLDivElement>(null)
  const marqueeWrapRef = useRef<HTMLDivElement>(null)
  const marqueeTextRef = useRef<HTMLDivElement>(null)
  const loaderRef = useRef<HTMLDivElement>(null)
  const loaderBarRef = useRef<HTMLDivElement>(null)
  const loaderPercentRef = useRef<HTMLSpanElement>(null)
  const statsRef = useRef<HTMLElement>(null)

  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
  const statRefs = useRef<(HTMLSpanElement | null)[]>([])

  const framesRef = useRef<HTMLImageElement[]>([])
  const currentFrameRef = useRef(0)
  const bgColorRef = useRef("rgb(235,235,242)")
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const dprRef = useRef(1)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const canvas = canvasRef.current
    const canvasWrap = canvasWrapRef.current
    const hero = heroRef.current
    const scrollContainer = scrollContainerRef.current
    const darkOverlay = darkOverlayRef.current
    const marqueeWrap = marqueeWrapRef.current
    const marqueeText = marqueeTextRef.current
    const loader = loaderRef.current
    const loaderBar = loaderBarRef.current
    const loaderPercent = loaderPercentRef.current

    if (!canvas || !canvasWrap || !hero || !scrollContainer || !darkOverlay) return

    // ── Lenis smooth scroll ────────────────────────────
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })
    lenis.on("scroll", ScrollTrigger.update)
    const tickerFn = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tickerFn)
    gsap.ticker.lagSmoothing(0)

    // ── Canvas setup ───────────────────────────────────
    dprRef.current = window.devicePixelRatio || 1

    function sampleBgColor() {
      const ctx2d = ctxRef.current
      if (!ctx2d || !canvas) return
      const dpr = dprRef.current
      try {
        const s1 = ctx2d.getImageData(0, 0, 1, 1).data
        const s2 = ctx2d.getImageData(Math.max(0, canvas.width / dpr - 1), 0, 1, 1).data
        bgColorRef.current = `rgb(${Math.round((s1[0] + s2[0]) / 2)},${Math.round((s1[1] + s2[1]) / 2)},${Math.round((s1[2] + s2[2]) / 2)})`
      } catch {}
    }

    function drawFrame(index: number) {
      const ctx2d = ctxRef.current
      if (!ctx2d || !canvas) return
      const img = framesRef.current[index]
      if (!img?.complete || img.naturalWidth === 0) return

      const dpr = dprRef.current
      const cw = canvas.width / dpr
      const ch = canvas.height / dpr
      const iw = img.naturalWidth
      const ih = img.naturalHeight
      const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE
      const dw = iw * scale, dh = ih * scale
      const dx = (cw - dw) / 2, dy = (ch - dh) / 2

      ctx2d.fillStyle = bgColorRef.current
      ctx2d.fillRect(0, 0, cw, ch)
      ctx2d.drawImage(img, dx, dy, dw, dh)
      if (index % 20 === 0) sampleBgColor()
    }

    function resizeCanvas() {
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      dprRef.current = dpr
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      const ctx2d = canvas.getContext("2d")
      if (ctx2d) {
        ctx2d.scale(dpr, dpr)
        ctxRef.current = ctx2d
      }
      drawFrame(currentFrameRef.current)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // ── Frame loading ──────────────────────────────────
    let loaded = 0
    const frames: HTMLImageElement[] = []

    function loadFrame(i: number) {
      const img = new window.Image()
      img.src = `/frames/frame_${String(i + 1).padStart(4, "0")}.webp`
      img.onload = img.onerror = () => {
        frames[i] = img
        loaded++
        const pct = Math.round((loaded / FRAME_COUNT) * 100)
        if (loaderBar) loaderBar.style.width = `${pct}%`
        if (loaderPercent) loaderPercent.textContent = `${pct}%`
        if (loaded === FRAME_COUNT) {
          framesRef.current = frames
          drawFrame(0)
          setTimeout(() => {
            if (loader) {
              loader.style.opacity = "0"
              loader.style.pointerEvents = "none"
              setTimeout(() => { if (loader) loader.style.display = "none" }, 700)
            }
          }, 300)
        }
      }
    }

    for (let i = 0; i < Math.min(10, FRAME_COUNT); i++) loadFrame(i)
    requestAnimationFrame(() => {
      for (let i = 10; i < FRAME_COUNT; i++) loadFrame(i)
    })

    // ── Hero entrance animation ────────────────────────
    const heroWords = hero.querySelectorAll(".hero-word")
    const heroTagline = hero.querySelector(".hero-tagline")
    const heroLabel = hero.querySelector(".hero-label")
    const heroScroll = hero.querySelector(".hero-scroll")

    gsap.set([heroLabel, heroTagline, heroScroll], { opacity: 0, y: 20 })
    gsap.set(heroWords, { opacity: 0, y: 80 })

    const heroTl = gsap.timeline({ delay: 0.4 })
    heroTl
      .to(heroLabel, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0)
      .to(heroWords, { y: 0, opacity: 1, stagger: 0.08, duration: 0.9, ease: "power3.out" }, 0.2)
      .to(heroTagline, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, 0.8)
      .to(heroScroll, { y: 0, opacity: 1, duration: 0.5 }, 1.3)

    // ── Main scroll driver ─────────────────────────────
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate(self) {
        const p = self.progress

        // Hero fade + hide
        hero.style.opacity = String(Math.max(0, 1 - p * 18))
        if (p > 0.08) {
          hero.style.pointerEvents = "none"
          hero.style.visibility = "hidden"
        } else {
          hero.style.pointerEvents = "auto"
          hero.style.visibility = "visible"
        }

        // Canvas circle-wipe reveal
        const wipeP = Math.min(1, Math.max(0, (p - 0.01) / 0.07))
        canvasWrap.style.clipPath = `circle(${wipeP * 80}% at 50% 50%)`

        // Frame scrubbing
        if (framesRef.current.length > 0) {
          const acc = Math.min(p * FRAME_SPEED, 1)
          const idx = Math.min(Math.floor(acc * FRAME_COUNT), FRAME_COUNT - 1)
          if (idx !== currentFrameRef.current) {
            currentFrameRef.current = idx
            requestAnimationFrame(() => drawFrame(idx))
          }
        }

        // Dark overlay for stats (57-72%)
        const se = 0.57, sl = 0.72, fr = 0.04
        let oa = 0
        if (p >= se - fr && p < se) oa = (p - (se - fr)) / fr
        else if (p >= se && p <= sl) oa = 0.9
        else if (p > sl && p <= sl + fr) oa = 0.9 * (1 - (p - sl) / fr)
        darkOverlay.style.opacity = String(oa)

        // Marquee visibility (22-85%)
        if (marqueeWrap) {
          let mo = 0
          if (p >= 0.22 && p < 0.25) mo = (p - 0.22) / 0.03
          else if (p >= 0.25 && p <= 0.82) mo = 1
          else if (p > 0.82 && p <= 0.85) mo = 1 - (p - 0.82) / 0.03
          marqueeWrap.style.opacity = String(mo)
        }

        // Hide canvas at end for footer
        canvasWrap.style.opacity = p >= 0.998 ? "0" : "1"
      },
    })

    // ── Marquee scroll animation ───────────────────────
    if (marqueeText) {
      gsap.to(marqueeText, {
        xPercent: -30,
        ease: "none",
        scrollTrigger: {
          trigger: scrollContainer,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      })
    }

    // ── Section animations ─────────────────────────────
    SECTIONS.forEach((sec) => {
      const el = sectionRefs.current.get(sec.id)
      if (!el) return

      const enter = sec.enter / 100
      const leave = sec.leave / 100
      const persist = !!sec.persist

      const children = Array.from(el.querySelectorAll(".sec-label, .sec-heading, .sec-body, .cta-buttons"))
      const tl = gsap.timeline({ paused: true })

      switch (sec.animation) {
        case "slide-left":
          tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" }); break
        case "slide-right":
          tl.from(children, { x: 80, opacity: 0, stagger: 0.14, duration: 0.9, ease: "power3.out" }); break
        case "scale-up":
          tl.from(children, { scale: 0.85, opacity: 0, stagger: 0.12, duration: 1.0, ease: "power2.out" }); break
        case "rotate-in":
          tl.from(children, { y: 40, rotation: 3, opacity: 0, stagger: 0.1, duration: 0.9, ease: "power3.out" }); break
        case "clip-reveal":
          tl.from(children, { clipPath: "inset(100% 0 0 0)", opacity: 0, stagger: 0.15, duration: 1.2, ease: "power4.inOut" }); break
        default:
          tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: "power3.out" })
      }

      let wasIn = false
      ScrollTrigger.create({
        trigger: scrollContainer,
        start: "top top",
        end: "bottom bottom",
        onUpdate(self) {
          const p = self.progress
          const inRange = p >= enter && p <= leave
          if (inRange && !wasIn) {
            wasIn = true
            tl.play()
          } else if (!inRange && wasIn && !persist) {
            wasIn = false
            tl.reverse()
          }
        },
      })
    })

    // ── Stats section animation ────────────────────────
    const statsEl = statsRef.current
    if (statsEl) {
      const statItems = Array.from(statsEl.querySelectorAll(".stat"))
      const statsTl = gsap.timeline({ paused: true })
      statsTl.from(statItems, { y: 60, opacity: 0, stagger: 0.18, duration: 0.8, ease: "power3.out" })

      let statsWasIn = false
      ScrollTrigger.create({
        trigger: scrollContainer,
        start: "top top",
        end: "bottom bottom",
        onUpdate(self) {
          const p = self.progress
          if (p >= 0.57 && p <= 0.72) {
            if (!statsWasIn) { statsWasIn = true; statsTl.play() }
          } else {
            if (statsWasIn) { statsWasIn = false; statsTl.pause(0) }
          }
        },
      })

      // Counter animations
      statRefs.current.forEach((el, i) => {
        if (!el) return
        const target = STATS[i].value
        const obj = { value: 0 }
        gsap.to(obj, {
          value: target,
          duration: 2.5,
          ease: "power1.out",
          onUpdate() {
            const v = Math.round(obj.value)
            el.textContent =
              v >= 1000000 ? (v / 1000000).toFixed(1) + "M" :
              v >= 1000 ? Math.round(v / 1000) + "K" :
              String(v)
          },
          scrollTrigger: {
            trigger: statsEl,
            start: "top 80%",
            toggleActions: "play none none reset",
          },
        })
      })
    }

    return () => {
      lenis.destroy()
      gsap.ticker.remove(tickerFn)
      ScrollTrigger.getAll().forEach((t) => t.kill())
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return (
    <div className="landing-root">
      {/* ── Loader ── */}
      <div ref={loaderRef} className="lp-loader">
        <div className="lp-loader-brand">
          <GraduationCap className="w-8 h-8" style={{ color: "#66CCFF" }} />
          <span>Escuela Digital MX</span>
        </div>
        <div className="lp-loader-track">
          <div ref={loaderBarRef} className="lp-loader-bar" />
        </div>
        <span ref={loaderPercentRef} className="lp-loader-percent">0%</span>
      </div>

      {/* ── Header ── */}
      <header className="lp-header">
        <Link href="#" className="lp-logo">
          <GraduationCap className="w-5 h-5" />
          <span>Escuela Digital MX</span>
        </Link>
        <nav className="lp-nav">
          <Link href="/login" className="lp-nav-link">Iniciar Sesión</Link>
          <Link href="/plans">
            <button className="lp-pill">Prueba Gratis</button>
          </Link>
        </nav>
      </header>

      {/* ── Hero (fixed) ── */}
      <section ref={heroRef} className="lp-hero">
        <span className="hero-label">Plataforma SaaS Educativa — México</span>
        <h1 className="hero-heading">
          {"La Gestión Escolar".split(" ").map((w, i) => (
            <span key={i} className="hero-word">{w}&nbsp;</span>
          ))}
          <br />
          {"del Futuro,".split(" ").map((w, i) => (
            <span key={i} className="hero-word">{w}&nbsp;</span>
          ))}
          <span className="hero-word hero-word--accent">Hoy.</span>
        </h1>
        <p className="hero-tagline">
          Administración, finanzas y psicología en una sola plataforma para escuelas modernas.
        </p>
        <div className="hero-scroll">
          <ArrowDown className="w-5 h-5 animate-bounce" />
          <span>Desplázate</span>
        </div>
      </section>

      {/* ── Canvas (fixed) ── */}
      <div ref={canvasWrapRef} className="lp-canvas-wrap" style={{ clipPath: "circle(0% at 50% 50%)" }}>
        <canvas ref={canvasRef} className="lp-canvas" />
      </div>

      {/* ── Dark overlay (fixed) ── */}
      <div ref={darkOverlayRef} className="lp-dark-overlay" style={{ opacity: 0 }} />

      {/* ── Marquee (fixed) ── */}
      <div ref={marqueeWrapRef} className="lp-marquee-wrap" style={{ opacity: 0 }}>
        <div ref={marqueeTextRef} className="lp-marquee-text">
          {Array(3).fill("ESCUELA DIGITAL MX — GESTIÓN MODERNA — IA EDUCATIVA — COBRANZA AUTOMÁTICA — REPORTES INSTANTÁNEOS — ").join("")}
        </div>
      </div>

      {/* ── Scroll container (800vh) ── */}
      <div ref={scrollContainerRef} className="lp-scroll-container">

        {/* Content sections */}
        {SECTIONS.map((sec) => (
          <section
            key={sec.id}
            ref={(el) => { if (el) sectionRefs.current.set(sec.id, el) }}
            className={`lp-section lp-section--${sec.align}`}
            style={{ top: `${(sec.enter + sec.leave) / 2}%` }}
          >
            <div className="sec-inner">
              <span className="sec-label">{sec.label}</span>
              <h2 className="sec-heading">{sec.heading}</h2>
              <p className="sec-body">{sec.body}</p>
              {sec.persist && (
                <div className="cta-buttons">
                  <Link href="/plans">
                    <button className="lp-cta-primary">
                      Comenzar Ahora <ArrowRight className="w-4 h-4 inline ml-2" />
                    </button>
                  </Link>
                  <Link href="/plans">
                    <button className="lp-cta-outline">Ver Planes</button>
                  </Link>
                </div>
              )}
            </div>
          </section>
        ))}

        {/* Stats section */}
        <section
          ref={statsRef}
          className="lp-section lp-stats-section"
          style={{ top: "64.5%" }}
        >
          <div className="lp-stats-grid">
            {STATS.map((stat, i) => (
              <div key={i} className="stat">
                <div className="stat-value-row">
                  <span ref={(el) => { statRefs.current[i] = el }} className="stat-number">0</span>
                  <span className="stat-suffix">{stat.suffix}</span>
                </div>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <p>© 2026 Escuela Digital MX. Todos los derechos reservados.</p>
        <nav className="lp-footer-nav">
          <Link href="#">Términos de Servicio</Link>
          <Link href="#">Privacidad</Link>
        </nav>
      </footer>
    </div>
  )
}

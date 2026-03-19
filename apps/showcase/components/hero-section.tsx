"use client"

import { useEffect, useRef, useState } from "react"
import { Apple, Play, ChevronDown, TrendingUp, Zap, Target, Activity } from "lucide-react"
import { motion, useScroll, useTransform, useSpring } from "motion/react"

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true) },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    const steps = 60
    const increment = target / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(current))
    }, 25)
    return () => clearInterval(timer)
  }, [started, target])

  return (
    <div ref={ref} className="text-3xl font-bold text-foreground tabular-nums">
      {count.toLocaleString()}{suffix}
    </div>
  )
}

// Phone mockup component for reuse
function PhoneMockup({ 
  variant = "main", 
  delay = 0,
  className = ""
}: { 
  variant?: "main" | "left" | "right" | "small-left" | "small-right"
  delay?: number
  className?: string
}) {
  const bars = variant === "main" ? [40, 65, 45, 80, 55, 90, 70] : [55, 70, 45, 85, 60, 75, 90]
  const progress = variant === "main" ? 78 : variant === "left" ? 85 : variant === "right" ? 62 : 70
  
  const screens: Record<string, { title: string; value: string; subtitle: string; icon: React.ReactNode }> = {
    main: { title: "Today's Progress", value: "78%", subtitle: "Performance Score", icon: <TrendingUp className="w-4 h-4" /> },
    left: { title: "Daily Goals", value: "85%", subtitle: "Completed Tasks", icon: <Target className="w-4 h-4" /> },
    right: { title: "Energy Level", value: "62%", subtitle: "Recovery Status", icon: <Zap className="w-4 h-4" /> },
    "small-left": { title: "Activity", value: "92", subtitle: "Active Minutes", icon: <Activity className="w-4 h-4" /> },
    "small-right": { title: "Streak", value: "14", subtitle: "Days Active", icon: <TrendingUp className="w-4 h-4" /> },
  }

  const screen = screens[variant]
  const isSmall = variant.includes("small")
  const frameSize = isSmall 
    ? "w-[160px] h-[320px]" 
    : variant === "main" 
      ? "w-[280px] sm:w-[300px] h-[560px] sm:h-[600px]" 
      : "w-[220px] h-[440px]"

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotate: variant === "left" || variant === "small-left" ? -8 : variant === "right" || variant === "small-right" ? 8 : 0 }}
      animate={{ opacity: 1, y: 0, rotate: variant === "left" || variant === "small-left" ? -8 : variant === "right" || variant === "small-right" ? 8 : 0 }}
      transition={{ duration: 0.9, delay, ease: "easeOut" }}
      className={`relative ${className}`}
    >
      {/* Glow ring */}
      {variant === "main" && (
        <motion.div
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 scale-110 bg-primary/20 rounded-[3.5rem] blur-2xl -z-10"
        />
      )}

      {/* Phone Frame */}
      <div className={`relative ${frameSize} bg-foreground rounded-[2.5rem] ${isSmall ? "p-2" : "p-3"} shadow-2xl shadow-foreground/30`}>
        <div className={`w-full h-full bg-card ${isSmall ? "rounded-[2rem]" : "rounded-[2.5rem]"} overflow-hidden relative`}>
          {/* Notch */}
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 ${isSmall ? "w-16 h-4" : "w-24 h-6"} bg-foreground rounded-b-2xl z-10`} />

          <div className={`absolute inset-0 flex flex-col ${isSmall ? "pt-5" : "pt-8"}`}>
            {/* Status Bar */}
            <div className={`flex items-center justify-between ${isSmall ? "px-3 py-1" : "px-6 py-2"}`}>
              <span className={`${isSmall ? "text-[10px]" : "text-xs"} font-medium text-foreground`}>9:41</span>
              <div className={`${isSmall ? "w-3 h-2" : "w-4 h-2.5"} border border-foreground rounded-sm relative`}>
                <div className="absolute right-0.5 top-0.5 bottom-0.5 left-1 bg-primary rounded-sm" />
              </div>
            </div>

            {/* App Content */}
            <div className={`flex-1 ${isSmall ? "px-2 py-1" : "px-4 py-2"} overflow-hidden`}>
              {/* Progress Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + 0.5 }}
                className={`bg-primary/10 ${isSmall ? "rounded-xl p-2 mb-2" : "rounded-2xl p-4 mb-3"} border border-primary/20`}
              >
                <div className="flex items-center justify-between">
                  <div className={`${isSmall ? "text-[9px]" : "text-xs"} text-muted-foreground mb-1`}>{screen.title}</div>
                  <div className="text-primary">{screen.icon}</div>
                </div>
                <div className={`${isSmall ? "text-xl" : "text-2xl"} font-bold text-foreground`}>{screen.value}</div>
                <div className={`mt-2 ${isSmall ? "h-1.5" : "h-2"} bg-muted rounded-full overflow-hidden`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.2, delay: delay + 0.7, ease: "easeOut" }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </motion.div>

              {/* Chart Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + 0.6 }}
                className={`bg-card/90 ${isSmall ? "rounded-xl p-2 mb-2" : "rounded-2xl p-4 mb-3"} border border-border`}
              >
                <div className={`${isSmall ? "text-[9px]" : "text-xs"} text-muted-foreground mb-2`}>{screen.subtitle}</div>
                <div className={`flex items-end gap-1 ${isSmall ? "h-10" : "h-16"}`}>
                  {bars.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: delay + 0.8 + i * 0.08, ease: "easeOut" }}
                      className="flex-1 origin-bottom"
                    >
                      <div
                        className="w-full bg-primary rounded-t"
                        style={{ height: `${h}%`, opacity: 0.4 + i * 0.08 }}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Mini Stats - only on larger phones */}
              {!isSmall && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: delay + 0.7 }}
                  className="grid grid-cols-2 gap-2"
                >
                  {[{ label: "Sessions", val: variant === "main" ? "24" : variant === "left" ? "18" : "31" }, { label: "Hours", val: variant === "main" ? "48.5" : variant === "left" ? "36.2" : "52.8" }].map((s) => (
                    <div key={s.label} className="bg-card/90 rounded-xl p-3 border border-border">
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      <div className="text-lg font-bold text-foreground">{s.val}</div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] })
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, 80])
  const phoneYSpring = useSpring(phoneY, { stiffness: 100, damping: 30 })
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <section ref={containerRef} style={{ position: "relative" }} className="relative pt-28 pb-20 lg:pt-36 lg:pb-32 min-h-screen flex items-center overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[80px]"
        />
        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-primary/40 rounded-full"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <motion.div style={{ opacity }} className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-6"
            >
              <motion.span
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-primary rounded-full"
              />
              New: Advanced Analytics Dashboard
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05] text-balance"
            >
              Unlock Your
              <br />
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="text-primary relative inline-block"
              >
                Peak Performance
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
                  className="absolute -bottom-1 left-0 right-0 h-1 bg-primary/30 rounded-full origin-left"
                />
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 text-pretty leading-relaxed"
            >
              Track, analyze, and optimize your performance with precision.
              PH Performance gives you the insights you need to reach your goals faster.
            </motion.p>

            {/* Download Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              {[
                { href: "https://apps.apple.com", label: "Download on the", store: "App Store", icon: <Apple className="w-7 h-7" /> },
                { href: "https://play.google.com", label: "Get it on", store: "Google Play", icon: <Play className="w-7 h-7" fill="currentColor" /> },
              ].map((btn, i) => (
                <motion.a
                  key={btn.store}
                  href={btn.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="inline-flex items-center justify-center gap-3 px-6 py-4 bg-foreground text-background rounded-2xl shadow-xl shadow-foreground/10 hover:shadow-foreground/20 transition-shadow"
                >
                  {btn.icon}
                  <div className="text-left">
                    <div className="text-xs opacity-70">{btn.label}</div>
                    <div className="text-base font-semibold">{btn.store}</div>
                  </div>
                </motion.a>
              ))}
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-12 flex items-center justify-center lg:justify-start gap-8 sm:gap-12"
            >
              {[
                { target: 500, suffix: "K+", label: "Active Users" },
                { target: 49, suffix: "/5", label: "App Rating", raw: "4.9" },
                { target: 150, suffix: "+", label: "Countries" },
              ].map((stat, i) => (
                <div key={stat.label} className="flex items-center gap-8 sm:gap-12">
                  {i > 0 && <div className="w-px h-12 bg-border" />}
                  <div>
                    {stat.raw ? (
                      <div className="text-3xl font-bold text-foreground">{stat.raw}</div>
                    ) : (
                      <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                    )}
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Multiple Phone Mockups */}
          <motion.div style={{ y: phoneYSpring }} className="relative flex justify-center lg:justify-end">
            <div className="relative">
              {/* Small phone - far left */}
              <div className="absolute -left-32 top-20 hidden xl:block opacity-60">
                <PhoneMockup variant="small-left" delay={0.8} />
              </div>

              {/* Left phone */}
              <div className="absolute -left-16 top-8 hidden lg:block opacity-80 -z-10">
                <PhoneMockup variant="left" delay={0.5} />
              </div>

              {/* Main center phone */}
              <div className="relative z-10">
                <PhoneMockup variant="main" delay={0.3} />
                
                {/* Floating badges for main phone */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.5 }}
                  className="absolute -right-4 top-1/3 bg-card border border-border rounded-2xl px-4 py-3 shadow-xl z-20"
                >
                  <div className="text-xs text-muted-foreground">Streak</div>
                  <div className="text-xl font-bold text-primary">14 days</div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.6 }}
                  className="absolute -left-4 bottom-1/3 bg-card border border-border rounded-2xl px-4 py-3 shadow-xl z-20 lg:hidden"
                >
                  <div className="text-xs text-muted-foreground">Score</div>
                  <div className="text-xl font-bold text-primary">92 pts</div>
                </motion.div>
              </div>

              {/* Right phone */}
              <div className="absolute -right-16 top-8 hidden lg:block opacity-80 -z-10">
                <PhoneMockup variant="right" delay={0.6} />
              </div>

              {/* Small phone - far right */}
              <div className="absolute -right-32 top-20 hidden xl:block opacity-60">
                <PhoneMockup variant="small-right" delay={0.9} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground"
      >
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </motion.div>
    </section>
  )
}

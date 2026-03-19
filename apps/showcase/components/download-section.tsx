"use client"

import { useRef } from "react"
import { Apple, Play, CheckCircle2, Star, Zap, Target } from "lucide-react"
import { motion, useInView } from "motion/react"

// Floating phone component for download section
function FloatingPhone({ 
  position,
  delay = 0,
  screen
}: { 
  position: "left" | "right"
  delay?: number
  screen: { title: string; value: string; icon: React.ReactNode }
}) {
  const bars = position === "left" ? [55, 75, 50, 90, 65] : [60, 80, 55, 85, 70]
  
  return (
    <motion.div
      initial={{ opacity: 0, x: position === "left" ? -50 : 50, rotate: position === "left" ? -12 : 12 }}
      whileInView={{ opacity: 1, x: 0, rotate: position === "left" ? -12 : 12 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay }}
      className={`absolute ${position === "left" ? "-left-4 sm:left-4 lg:left-12" : "-right-4 sm:right-4 lg:right-12"} top-1/2 -translate-y-1/2 hidden sm:block`}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: position === "left" ? 0 : 2 }}
      >
        {/* Phone Frame */}
        <div className="relative w-[120px] lg:w-[140px] h-[240px] lg:h-[280px] bg-white/10 backdrop-blur-sm rounded-[1.5rem] p-1.5 shadow-2xl border border-white/20">
          <div className="w-full h-full bg-card rounded-[1.2rem] overflow-hidden relative">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-2.5 bg-foreground rounded-b-lg z-10" />

            <div className="absolute inset-0 flex flex-col pt-4">
              {/* Status Bar */}
              <div className="flex items-center justify-between px-2 py-0.5">
                <span className="text-[7px] font-medium text-foreground">9:41</span>
                <div className="w-2 h-1 border border-foreground rounded-sm" />
              </div>

              {/* App Content */}
              <div className="flex-1 px-2 py-1">
                {/* Header */}
                <div className="bg-primary/15 rounded-lg p-2 mb-2">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="text-primary scale-75">{screen.icon}</div>
                    <span className="text-[7px] text-muted-foreground">{screen.title}</span>
                  </div>
                  <div className="text-sm font-bold text-foreground">{screen.value}</div>
                </div>

                {/* Chart */}
                <div className="bg-muted/30 rounded-lg p-1.5">
                  <div className="flex items-end gap-0.5 h-6">
                    {bars.map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: delay + 0.3 + i * 0.08 }}
                        className="flex-1 origin-bottom"
                      >
                        <div
                          className="w-full bg-primary rounded-t"
                          style={{ height: `${h}%`, opacity: 0.5 + i * 0.1 }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Mini stats */}
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {[{ val: "18" }, { val: "4.9" }].map((s, i) => (
                    <div key={i} className="bg-card rounded p-1 border border-border/50">
                      <div className="text-[7px] text-muted-foreground">{i === 0 ? "Sessions" : "Rating"}</div>
                      <div className="text-[10px] font-bold text-foreground">{s.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Glow effect */}
        <div className="absolute inset-0 bg-white/5 rounded-[1.5rem] blur-xl -z-10" />
      </motion.div>
    </motion.div>
  )
}

export function DownloadSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section id="download" className="py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50, scale: 0.97 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative bg-primary rounded-3xl p-8 sm:p-12 lg:p-16 overflow-hidden"
        >
          {/* Animated background blobs */}
          <motion.div
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"
          />
          <motion.div
            animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2 pointer-events-none"
          />

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.04] rounded-3xl overflow-hidden pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />

          {/* Floating phones */}
          <FloatingPhone 
            position="left" 
            delay={0.3} 
            screen={{ title: "Daily Goal", value: "92%", icon: <Target className="w-3 h-3" /> }} 
          />
          <FloatingPhone 
            position="right" 
            delay={0.5} 
            screen={{ title: "Power", value: "850W", icon: <Zap className="w-3 h-3" /> }} 
          />

          <div className="relative text-center max-w-2xl mx-auto">
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.2 }}
              className="inline-block px-4 py-1.5 bg-white/20 text-white text-xs font-semibold tracking-widest uppercase rounded-full mb-6 border border-white/30"
            >
              Get Started Free
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground text-balance"
            >
              Start your performance journey today
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-4 text-lg text-primary-foreground/80 text-pretty"
            >
              Download PH Performance now and join over 500,000 users who are already unlocking their peak potential.
            </motion.p>

            {/* Star rating */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.5 }}
              className="mt-6 flex items-center justify-center gap-1"
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.6 + i * 0.1, type: "spring" }}
                >
                  <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                </motion.div>
              ))}
              <span className="ml-2 text-primary-foreground/80 text-sm">4.9 from 50K+ reviews</span>
            </motion.div>

            {/* Download Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.5 }}
              className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
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
                  initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center justify-center gap-3 px-6 py-4 bg-background text-foreground rounded-2xl shadow-2xl shadow-black/20 hover:shadow-black/30 transition-shadow"
                >
                  {btn.icon}
                  <div className="text-left">
                    <div className="text-xs opacity-60">{btn.label}</div>
                    <div className="text-base font-bold">{btn.store}</div>
                  </div>
                </motion.a>
              ))}
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.8 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/70"
            >
              {[
                { text: "Free to download" },
                { text: "Secure & Private" },
                { text: "No credit card required" },
              ].map((badge, i) => (
                <motion.div
                  key={badge.text}
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.9 + i * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary-foreground/80" />
                  <span>{badge.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

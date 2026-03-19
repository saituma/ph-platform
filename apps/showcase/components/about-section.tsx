"use client"

import { useRef } from "react"
import { CheckCircle2, TrendingUp, Users, Award, Flame } from "lucide-react"
import { motion, useInView } from "motion/react"

const benefits = [
  "Track multiple performance metrics simultaneously",
  "Set and achieve personalized goals",
  "Get AI-powered recommendations",
  "Sync seamlessly across all devices",
  "Export detailed performance reports",
  "Join a community of 500K+ users",
]

// Mini phone component for this section
function MiniPhone({ 
  screen, 
  delay = 0,
  className = ""
}: { 
  screen: { title: string; value: string; icon: React.ReactNode; color: string; progress?: number }
  delay?: number
  className?: string
}) {
  const bars = [50, 70, 45, 85, 60, 75, 55]
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`relative ${className}`}
    >
      {/* Phone Frame */}
      <div className="relative w-[140px] h-[280px] bg-foreground rounded-[1.8rem] p-2 shadow-2xl shadow-foreground/20">
        <div className="w-full h-full bg-card rounded-[1.5rem] overflow-hidden relative">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-3 bg-foreground rounded-b-xl z-10" />

          <div className="absolute inset-0 flex flex-col pt-4">
            {/* Status Bar */}
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-[8px] font-medium text-foreground">9:41</span>
              <div className="w-2.5 h-1.5 border border-foreground rounded-sm relative">
                <div className="absolute right-0.5 top-0.5 bottom-0.5 left-0.5 bg-primary rounded-sm" />
              </div>
            </div>

            {/* App Content */}
            <div className="flex-1 px-2 py-1 overflow-hidden">
              {/* Header Card */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: delay + 0.3 }}
                className={`${screen.color} rounded-lg p-2 mb-2`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="text-white/80 scale-75">{screen.icon}</div>
                  <span className="text-[8px] text-white/70">{screen.title}</span>
                </div>
                <div className="text-lg font-bold text-white">{screen.value}</div>
                {screen.progress && (
                  <div className="mt-1.5 h-1 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${screen.progress}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: delay + 0.5 }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                )}
              </motion.div>

              {/* Chart */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: delay + 0.4 }}
                className="bg-muted/50 rounded-lg p-2 mb-2"
              >
                <div className="flex items-end gap-0.5 h-8">
                  {bars.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: delay + 0.6 + i * 0.05 }}
                      className="flex-1 origin-bottom"
                    >
                      <div
                        className="w-full bg-primary rounded-t"
                        style={{ height: `${h}%`, opacity: 0.5 + i * 0.07 }}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-1">
                {[{ label: "Sessions", val: "12" }, { label: "Hours", val: "24" }].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: delay + 0.7 + i * 0.1 }}
                    className="bg-card rounded-lg p-1.5 border border-border"
                  >
                    <div className="text-[7px] text-muted-foreground">{s.label}</div>
                    <div className="text-xs font-bold text-foreground">{s.val}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function AboutSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  const phoneScreens = [
    { title: "Daily Goals", value: "85%", icon: <TrendingUp className="w-3 h-3" />, color: "bg-primary", progress: 85 },
    { title: "Team Score", value: "1,240", icon: <Users className="w-3 h-3" />, color: "bg-accent", progress: 72 },
    { title: "Achievements", value: "24", icon: <Award className="w-3 h-3" />, color: "bg-primary/80", progress: 60 },
    { title: "Streak", value: "14 days", icon: <Flame className="w-3 h-3" />, color: "bg-accent/90", progress: 90 },
  ]

  return (
    <section id="about" className="py-20 lg:py-32 overflow-hidden">
      <div ref={ref} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Visual side with multiple phones */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative order-2 lg:order-1"
          >
            <div className="relative py-8">
              {/* Background glow */}
              <motion.div
                animate={{ opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 bg-primary/10 rounded-3xl blur-3xl"
              />

              {/* Phone grid */}
              <div className="relative flex items-center justify-center gap-4">
                {/* Left column of phones */}
                <div className="flex flex-col gap-4">
                  <MiniPhone screen={phoneScreens[0]} delay={0.2} />
                  <MiniPhone screen={phoneScreens[1]} delay={0.4} className="ml-6" />
                </div>

                {/* Right column of phones */}
                <div className="flex flex-col gap-4 mt-8">
                  <MiniPhone screen={phoneScreens[2]} delay={0.3} />
                  <MiniPhone screen={phoneScreens[3]} delay={0.5} className="-ml-6" />
                </div>
              </div>

              {/* Floating stats badges */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.8, type: "spring" }}
                className="absolute -top-2 left-1/2 -translate-x-1/2 bg-card border border-primary/20 rounded-xl px-4 py-2 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-foreground">Real-time Sync</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 1.0, type: "spring" }}
                className="absolute -bottom-2 right-8 bg-card border border-accent/20 rounded-xl px-4 py-2 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-accent" />
                  <span className="text-xs font-medium text-foreground">+23% this week</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Content side */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="order-1 lg:order-2"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5 }}
              className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-xs font-semibold tracking-widest uppercase rounded-full mb-4 border border-primary/20"
            >
              About
            </motion.span>

            <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
              Why choose
              <span className="text-primary"> PH Performance?</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-pretty leading-relaxed">
              Built by athletes for athletes, PH Performance combines cutting-edge technology
              with intuitive design to help you reach your peak potential.
            </p>

            <ul className="mt-8 space-y-3">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + index * 0.08, duration: 0.45 }}
                  className="flex items-start gap-3 group"
                >
                  <motion.div whileHover={{ scale: 1.2, rotate: 10 }} transition={{ type: "spring", stiffness: 400 }}>
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  </motion.div>
                  <span className="text-foreground group-hover:text-primary transition-colors duration-200">{benefit}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

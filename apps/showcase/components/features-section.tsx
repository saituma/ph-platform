"use client"

import { useRef } from "react"
import { BarChart3, Target, Zap, Shield, Smartphone, TrendingUp } from "lucide-react"
import { motion, useInView } from "motion/react"

const features = [
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Deep insights into your performance metrics with beautiful visualizations and detailed reports.",
  },
  {
    icon: Target,
    title: "Goal Tracking",
    description: "Set ambitious goals and track your progress with precision. Stay motivated with milestone celebrations.",
  },
  {
    icon: Zap,
    title: "Real-time Sync",
    description: "Your data syncs instantly across all devices. Never miss a beat in tracking your performance.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your data is encrypted and secure. We prioritize your privacy with enterprise-grade security.",
  },
  {
    icon: Smartphone,
    title: "Offline Mode",
    description: "Track your performance even without internet. Data syncs automatically when back online.",
  },
  {
    icon: TrendingUp,
    title: "AI Insights",
    description: "Powered by machine learning to provide personalized recommendations for improvement.",
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
}

export function FeaturesSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section id="features" className="py-20 lg:py-32 bg-card relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute inset-0 -z-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div ref={ref} className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-xs font-semibold tracking-widest uppercase rounded-full mb-4 border border-primary/20"
          >
            Features
          </motion.span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Everything you need to
            <span className="text-primary"> perform better</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Powerful features designed to help you track, analyze, and improve your performance every single day.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ y: -6, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="group p-7 bg-background rounded-2xl border border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-default"
            >
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0], scale: 1.15 }}
                transition={{ duration: 0.4 }}
                className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors"
              >
                <feature.icon className="w-6 h-6 text-primary" />
              </motion.div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>

              {/* Hover accent line */}
              <motion.div
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
                className="mt-4 h-px bg-primary/40 origin-left"
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

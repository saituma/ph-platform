"use client"

import { useRef } from "react"
import { Star, Quote } from "lucide-react"
import { motion, useInView } from "motion/react"

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Professional Athlete",
    content: "PH Performance has completely transformed how I track my training. The insights are incredible and have helped me improve my performance by 30%.",
    rating: 5,
    avatar: "SM",
  },
  {
    name: "James Rodriguez",
    role: "Fitness Coach",
    content: "I recommend this app to all my clients. The analytics are top-notch and the goal tracking keeps everyone motivated and accountable.",
    rating: 5,
    avatar: "JR",
  },
  {
    name: "Emily Chen",
    role: "Marathon Runner",
    content: "The offline mode is a game-changer for outdoor training. I can track everything without worrying about connectivity.",
    rating: 5,
    avatar: "EC",
  },
]

export function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section id="testimonials" className="py-20 lg:py-32 bg-card relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div ref={ref} className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
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
            Testimonials
          </motion.span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Loved by
            <span className="text-primary"> athletes worldwide</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join thousands of users who have transformed their performance with our app.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50, rotate: index === 1 ? 0 : index === 0 ? -2 : 2 }}
              animate={isInView ? { opacity: 1, y: 0, rotate: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group bg-background rounded-2xl p-8 border border-border hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-default relative"
            >
              {/* Quote icon */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.4 + index * 0.15, type: "spring" }}
                className="absolute top-6 right-6 text-primary/20 group-hover:text-primary/40 transition-colors"
              >
                <Quote className="w-8 h-8" />
              </motion.div>

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 0.5 + index * 0.1 + i * 0.05, type: "spring" }}
                  >
                    <Star className="w-4 h-4 fill-primary text-primary" />
                  </motion.div>
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground mb-6 leading-relaxed text-sm">
                &ldquo;{testimonial.content}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="w-11 h-11 bg-primary/15 rounded-full flex items-center justify-center border border-primary/20"
                >
                  <span className="text-primary font-semibold text-sm">{testimonial.avatar}</span>
                </motion.div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>

              {/* Bottom accent */}
              <motion.div
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.4 }}
                className="absolute bottom-0 left-8 right-8 h-0.5 bg-primary/40 rounded-full origin-left"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Bubble = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-2xl px-3 py-2.5 text-sm", className)} {...props} />
  ),
)
Bubble.displayName = "Bubble"

const BubbleContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("whitespace-pre-wrap break-words", className)} {...props} />
  ),
)
BubbleContent.displayName = "BubbleContent"

export { Bubble, BubbleContent }

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const MessageAlignCtx = React.createContext<"start" | "end">("start")

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end"
}

const Message = React.forwardRef<HTMLDivElement, MessageProps>(
  ({ className, align = "start", children, ...props }, ref) => (
    <MessageAlignCtx.Provider value={align}>
      <div
        ref={ref}
        className={cn(
          "flex w-full gap-2",
          align === "end" && "flex-row-reverse",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </MessageAlignCtx.Provider>
  ),
)
Message.displayName = "Message"

const MessageGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-0.5", className)} {...props} />
  ),
)
MessageGroup.displayName = "MessageGroup"

const MessageAvatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex shrink-0 self-end", className)} {...props} />
  ),
)
MessageAvatar.displayName = "MessageAvatar"

const MessageContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const align = React.useContext(MessageAlignCtx)
    return (
      <div
        ref={ref}
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-1",
          align === "end" && "items-end",
          className,
        )}
        {...props}
      />
    )
  },
)
MessageContent.displayName = "MessageContent"

const MessageHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 px-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  ),
)
MessageHeader.displayName = "MessageHeader"

const MessageFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const align = React.useContext(MessageAlignCtx)
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-1 px-1 text-[10px] text-muted-foreground",
          align === "end" && "flex-row-reverse",
          className,
        )}
        {...props}
      />
    )
  },
)
MessageFooter.displayName = "MessageFooter"

export {
  Message,
  MessageGroup,
  MessageAvatar,
  MessageContent,
  MessageHeader,
  MessageFooter,
}

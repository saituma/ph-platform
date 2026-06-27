"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Context ──────────────────────────────────────────────────────────────────

interface MSCtx {
  scrollToEnd: (behavior?: ScrollBehavior) => void
  scrollToStart: (behavior?: ScrollBehavior) => void
  scrollToMessage: (id: string) => boolean
  canScrollStart: boolean
  canScrollEnd: boolean
  _viewport: React.RefObject<HTMLDivElement | null>
  _setScrollable: (start: boolean, end: boolean) => void
  _items: React.MutableRefObject<Map<string, HTMLDivElement>>
  _anchors: React.MutableRefObject<Map<string, HTMLDivElement>>
  _anchorOrder: React.MutableRefObject<string[]>
  _autoScroll: boolean
  _atBottom: React.MutableRefObject<boolean>
  _pending: React.MutableRefObject<string | null>
  _observer: React.MutableRefObject<IntersectionObserver | null>
  _visibleIds: React.MutableRefObject<Set<string>>
  _visSubs: React.MutableRefObject<Set<() => void>>
  _currentAnchorId: React.MutableRefObject<string | null>
}

const Ctx = React.createContext<MSCtx | null>(null)

function useMSCtx() {
  const ctx = React.useContext(Ctx)
  if (!ctx) throw new Error("Must be inside MessageScrollerProvider")
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

type DefaultScrollPos = "start" | "end" | "last-anchor"

interface MessageScrollerProviderProps {
  children: React.ReactNode
  autoScroll?: boolean
  defaultScrollPosition?: DefaultScrollPos
  scrollPreviousItemPeek?: number
}

function MessageScrollerProvider({
  children,
  autoScroll = false,
  defaultScrollPosition = "end",
}: MessageScrollerProviderProps) {
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const itemsRef = React.useRef<Map<string, HTMLDivElement>>(new Map())
  const anchorsRef = React.useRef<Map<string, HTMLDivElement>>(new Map())
  const anchorOrderRef = React.useRef<string[]>([])
  const atBottomRef = React.useRef(true)
  const pendingRef = React.useRef<string | null>(null)
  const observerRef = React.useRef<IntersectionObserver | null>(null)
  const visibleIdsRef = React.useRef<Set<string>>(new Set())
  const visSubsRef = React.useRef<Set<() => void>>(new Set())
  const currentAnchorIdRef = React.useRef<string | null>(null)
  const defaultDoneRef = React.useRef(false)

  const [canScrollStart, setCanScrollStart] = React.useState(false)
  const [canScrollEnd, setCanScrollEnd] = React.useState(false)

  const setScrollable = React.useCallback((start: boolean, end: boolean) => {
    setCanScrollStart(start)
    setCanScrollEnd(end)
  }, [])

  const scrollToEnd = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    const vp = viewportRef.current
    if (!vp) return
    vp.scrollTo({ top: vp.scrollHeight, behavior })
  }, [])

  const scrollToStart = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    const vp = viewportRef.current
    if (!vp) return
    vp.scrollTo({ top: 0, behavior })
  }, [])

  const scrollToMessage = React.useCallback((id: string): boolean => {
    const el = itemsRef.current.get(id)
    if (!el) {
      pendingRef.current = id
      return false
    }
    el.scrollIntoView({ behavior: "smooth", block: "nearest" })
    return true
  }, [])

  // Apply default scroll position once (runs every render until done, so items have mounted)
  React.useEffect(() => {
    if (defaultDoneRef.current) return
    const vp = viewportRef.current
    if (!vp) return
    defaultDoneRef.current = true

    if (defaultScrollPosition === "end") {
      vp.scrollTop = vp.scrollHeight
    } else if (defaultScrollPosition === "last-anchor") {
      const order = anchorOrderRef.current
      const lastId = order[order.length - 1]
      const el = lastId ? anchorsRef.current.get(lastId) : null
      if (el) {
        el.scrollIntoView({ block: "start" })
      } else {
        vp.scrollTop = vp.scrollHeight
      }
    }
    // "start" → stays at top (no-op)
  })

  const value = React.useMemo<MSCtx>(
    () => ({
      scrollToEnd,
      scrollToStart,
      scrollToMessage,
      canScrollStart,
      canScrollEnd,
      _viewport: viewportRef,
      _setScrollable: setScrollable,
      _items: itemsRef,
      _anchors: anchorsRef,
      _anchorOrder: anchorOrderRef,
      _autoScroll: autoScroll,
      _atBottom: atBottomRef,
      _pending: pendingRef,
      _observer: observerRef,
      _visibleIds: visibleIdsRef,
      _visSubs: visSubsRef,
      _currentAnchorId: currentAnchorIdRef,
    }),
    [scrollToEnd, scrollToStart, scrollToMessage, canScrollStart, canScrollEnd, autoScroll, setScrollable],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useMessageScroller() {
  const ctx = useMSCtx()
  return React.useMemo(
    () => ({
      scrollToEnd: ctx.scrollToEnd,
      scrollToStart: ctx.scrollToStart,
      scrollToMessage: ctx.scrollToMessage,
    }),
    [ctx.scrollToEnd, ctx.scrollToStart, ctx.scrollToMessage],
  )
}

function useMessageScrollerScrollable() {
  const ctx = useMSCtx()
  return { start: ctx.canScrollStart, end: ctx.canScrollEnd }
}

function useMessageScrollerVisibility() {
  const ctx = useMSCtx()
  const [state, setState] = React.useState({
    currentAnchorId: null as string | null,
    visibleMessageIds: [] as string[],
  })

  React.useEffect(() => {
    const notify = () => {
      setState({
        currentAnchorId: ctx._currentAnchorId.current,
        visibleMessageIds: Array.from(ctx._visibleIds.current),
      })
    }
    ctx._visSubs.current.add(notify)
    return () => {
      ctx._visSubs.current.delete(notify)
    }
  }, [ctx])

  return state
}

// ─── MessageScroller ──────────────────────────────────────────────────────────

const MessageScroller = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("relative flex flex-col overflow-hidden", className)} {...props} />
  ),
)
MessageScroller.displayName = "MessageScroller"

// ─── MessageScrollerViewport ──────────────────────────────────────────────────

const MessageScrollerViewport = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const ctx = React.useContext(Ctx)
    const innerRef = React.useRef<HTMLDivElement>(null)

    React.useImperativeHandle(ref, () => innerRef.current!)

    // Keep ctx._viewport in sync
    React.useLayoutEffect(() => {
      if (!ctx) return
      ;(ctx._viewport as React.MutableRefObject<HTMLDivElement | null>).current = innerRef.current
    })

    // Scroll tracking → update canScroll + atBottom
    React.useEffect(() => {
      if (!ctx) return
      const el = innerRef.current
      if (!el) return
      const update = () => {
        const dist = el.scrollHeight - el.scrollTop - el.clientHeight
        ctx._atBottom.current = dist < 80
        ctx._setScrollable(el.scrollTop > 4, dist > 4)
      }
      el.addEventListener("scroll", update, { passive: true })
      update()
      return () => el.removeEventListener("scroll", update)
    }, [ctx])

    // Auto-scroll via ResizeObserver when user is at bottom
    React.useEffect(() => {
      if (!ctx?._autoScroll) return
      const el = innerRef.current
      if (!el) return
      const observer = new ResizeObserver(() => {
        if (ctx._atBottom.current) {
          el.scrollTop = el.scrollHeight
        }
      })
      observer.observe(el)
      const firstChild = el.firstElementChild
      if (firstChild) observer.observe(firstChild)
      return () => observer.disconnect()
    }, [ctx])

    // IntersectionObserver for visibility tracking
    React.useEffect(() => {
      if (!ctx) return
      const root = innerRef.current
      if (!root) return

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).dataset.msId
            if (!id) continue
            if (entry.isIntersecting) {
              ctx._visibleIds.current.add(id)
            } else {
              ctx._visibleIds.current.delete(id)
            }
          }

          // currentAnchorId: last anchor whose top edge has passed into or above the viewport
          const rootRect = root.getBoundingClientRect()
          let current = ctx._currentAnchorId.current
          for (const id of ctx._anchorOrder.current) {
            const el2 = ctx._anchors.current.get(id)
            if (!el2) continue
            if (el2.getBoundingClientRect().top < rootRect.bottom) {
              current = id
            }
          }
          ctx._currentAnchorId.current = current
          ctx._visSubs.current.forEach((fn) => fn())
        },
        { root, threshold: 0 },
      )

      ctx._observer.current = observer
      return () => {
        observer.disconnect()
        ctx._observer.current = null
      }
    }, [ctx])

    return (
      <div
        ref={innerRef}
        role="region"
        aria-label="Messages"
        tabIndex={0}
        className={cn(
          "flex-1 overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          className,
        )}
        {...props}
      />
    )
  },
)
MessageScrollerViewport.displayName = "MessageScrollerViewport"

// ─── MessageScrollerContent ───────────────────────────────────────────────────

const MessageScrollerContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="log"
      aria-relevant="additions"
      className={cn("flex flex-col gap-3 p-3", className)}
      {...props}
    />
  ),
)
MessageScrollerContent.displayName = "MessageScrollerContent"

// ─── MessageScrollerItem ──────────────────────────────────────────────────────

interface MessageScrollerItemProps extends React.HTMLAttributes<HTMLDivElement> {
  messageId?: string
  scrollAnchor?: boolean
}

const MessageScrollerItem = React.forwardRef<HTMLDivElement, MessageScrollerItemProps>(
  ({ className, messageId, scrollAnchor = false, ...props }, ref) => {
    const ctx = React.useContext(Ctx)
    const innerRef = React.useRef<HTMLDivElement>(null)

    React.useImperativeHandle(ref, () => innerRef.current!)

    React.useEffect(() => {
      if (!ctx || !messageId) return
      const el = innerRef.current
      if (!el) return

      ctx._items.current.set(messageId, el)

      if (scrollAnchor) {
        ctx._anchors.current.set(messageId, el)
        if (!ctx._anchorOrder.current.includes(messageId)) {
          ctx._anchorOrder.current = [...ctx._anchorOrder.current, messageId]
        }
      }

      ctx._observer.current?.observe(el)

      if (ctx._pending.current === messageId) {
        ctx._pending.current = null
        el.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }

      return () => {
        ctx._items.current.delete(messageId)
        if (scrollAnchor) {
          ctx._anchors.current.delete(messageId)
          ctx._anchorOrder.current = ctx._anchorOrder.current.filter((id) => id !== messageId)
        }
        ctx._observer.current?.unobserve(el)
        ctx._visibleIds.current.delete(messageId)
      }
    }, [ctx, messageId, scrollAnchor])

    return (
      <div
        ref={innerRef}
        data-ms-id={messageId}
        className={cn(className)}
        {...props}
      />
    )
  },
)
MessageScrollerItem.displayName = "MessageScrollerItem"

// ─── MessageScrollerButton ────────────────────────────────────────────────────

interface MessageScrollerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  direction?: "start" | "end"
  newCount?: number
}

const MessageScrollerButton = React.forwardRef<HTMLButtonElement, MessageScrollerButtonProps>(
  ({ className, direction = "end", newCount, children, ...props }, ref) => {
    const ctx = useMSCtx()
    const { start, end } = useMessageScrollerScrollable()
    const active = direction === "end" ? end : start
    const action = direction === "end" ? ctx.scrollToEnd : ctx.scrollToStart

    return (
      <button
        ref={ref}
        type="button"
        data-active={active}
        tabIndex={active ? 0 : -1}
        onClick={() => action()}
        aria-label={direction === "end" ? "Scroll to latest message" : "Scroll to top"}
        className={cn(
          "absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:bg-primary/90",
          active
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0",
          className,
        )}
        {...props}
      >
        {children ?? (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            {newCount != null && newCount > 0 ? (
              <span className="rounded-full bg-white/20 px-1.5">
                {newCount > 99 ? "99+" : newCount}
              </span>
            ) : null}
          </>
        )}
      </button>
    )
  },
)
MessageScrollerButton.displayName = "MessageScrollerButton"

export {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
}

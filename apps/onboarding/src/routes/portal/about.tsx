import { createFileRoute } from '@tanstack/react-router'
import { PageTransition } from "@/lib/motion";

export const Route = createFileRoute('/portal/about')({
  component: RouteComponent,
})

function RouteComponent() {
  return <PageTransition><div className="p-6">Hello "/portal/about"!</div></PageTransition>
}

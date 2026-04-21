import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/portal/about')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/portal/about"!</div>
}

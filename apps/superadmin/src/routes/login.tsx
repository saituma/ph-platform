import { createFileRoute } from '@tanstack/react-router'
import { redirectIfAuthed } from '../lib/auth'

export const Route = createFileRoute('/login')({
  beforeLoad: redirectIfAuthed,
})

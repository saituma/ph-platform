import { redirect } from '@tanstack/react-router'

export function requireAuth() {
  if (typeof window === 'undefined') return
  const token = localStorage.getItem('auth_token')
  if (!token) throw redirect({ to: '/login' })
}

export function redirectIfAuthed() {
  if (typeof window === 'undefined') return
  const token = localStorage.getItem('auth_token')
  if (token) throw redirect({ to: '/overview' })
}

export function logout() {
  localStorage.removeItem('auth_token')
  window.location.href = '/login'
}

import posthog from 'posthog-js'
import { PostHogProvider as BasePostHogProvider } from '@posthog/react'
import type { ReactNode } from 'react'

const posthogKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const isUsablePosthogKey =
  typeof posthogKey === 'string' &&
  posthogKey.trim().length > 0 &&
  posthogKey.startsWith('phc_') &&
  !posthogKey.includes('xxx')

if (typeof window !== 'undefined' && isUsablePosthogKey) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
    defaults: '2025-11-30',
  })
}

interface PostHogProviderProps {
  children: ReactNode
}

export default function PostHogProvider({ children }: PostHogProviderProps) {
  return <BasePostHogProvider client={posthog}>{children}</BasePostHogProvider>
}

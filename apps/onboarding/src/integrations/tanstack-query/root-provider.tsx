import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import * as Sentry from "@sentry/tanstackstart-react"

let clientQueryClient: QueryClient | undefined = undefined

function createQueryCache() {
  return new QueryCache({
    onError(error) {
      if (import.meta.env.PROD) {
        Sentry.captureException(error, { tags: { layer: "query" } })
      }
    },
  })
}

function createMutationCache() {
  return new MutationCache({
    onError(error) {
      if (import.meta.env.PROD) {
        Sentry.captureException(error, { tags: { layer: "mutation" } })
      }
    },
  })
}

export function getContext() {
  if (typeof window === 'undefined') {
    return {
      queryClient: new QueryClient({
        queryCache: createQueryCache(),
        mutationCache: createMutationCache(),
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 60 * 24,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
    }
  }

  if (!clientQueryClient) {
    clientQueryClient = new QueryClient({
      queryCache: createQueryCache(),
      mutationCache: createMutationCache(),
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5,
          gcTime: 1000 * 60 * 60 * 24,
          retry: 1,
          refetchOnWindowFocus: true,
          refetchOnMount: true,
        },
      },
    })
  }

  return {
    queryClient: clientQueryClient,
  }
}

export default function TanstackQueryProvider() {}

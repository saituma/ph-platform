import { QueryClient } from '@tanstack/react-query'

let clientQueryClient: QueryClient | undefined = undefined

export function getContext() {
  if (typeof window === 'undefined') {
    return {
      queryClient: new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
    }
  }

  if (!clientQueryClient) {
    clientQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes
          gcTime: 1000 * 60 * 60 * 24, // 24 hours
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

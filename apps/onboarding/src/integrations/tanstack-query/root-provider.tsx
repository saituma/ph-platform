import { QueryClient } from '@tanstack/react-query'

let clientQueryClient: QueryClient | undefined = undefined

export function getContext() {
  if (typeof window === 'undefined') {
    return {
      queryClient: new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
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
        },
      },
    })
  }

  return {
    queryClient: clientQueryClient,
  }
}

export default function TanstackQueryProvider() {}

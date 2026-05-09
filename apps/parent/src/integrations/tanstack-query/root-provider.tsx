import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

let clientQueryClient: QueryClient | undefined = undefined;

export function getContext() {
	if (typeof window === "undefined") {
		return {
			queryClient: new QueryClient({
				queryCache: new QueryCache(),
				mutationCache: new MutationCache(),
				defaultOptions: {
					queries: {
						staleTime: 1000 * 60 * 5,
						gcTime: 1000 * 60 * 60 * 24,
						retry: 1,
						refetchOnWindowFocus: false,
					},
				},
			}),
		};
	}

	if (!clientQueryClient) {
		clientQueryClient = new QueryClient({
			queryCache: new QueryCache(),
			mutationCache: new MutationCache(),
			defaultOptions: {
				queries: {
					staleTime: 1000 * 60 * 5,
					gcTime: 1000 * 60 * 60 * 24,
					retry: 1,
					refetchOnWindowFocus: true,
					refetchOnMount: true,
				},
			},
		});
	}

	return { queryClient: clientQueryClient };
}

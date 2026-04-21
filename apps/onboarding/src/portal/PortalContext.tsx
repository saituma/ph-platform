import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { env } from "@/env";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type PortalUser = {
	id: number;
	name: string;
	email: string;
	athleteName?: string;
	role?: string;
	programTier?: string;
	planExpiresAt?: string;
	createdAt?: string;
	birthDate?: string;
};

type PortalContextValue = {
	token: string | null;
	user: PortalUser | null;
	age: number | null;
	loading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
};

const PortalContext = createContext<PortalContextValue | null>(null);

export const portalKeys = {
	all: ["portal"] as const,
	user: (token: string | null) => [...portalKeys.all, "user", token] as const,
};

function calculateAge(birthDate: string | undefined): number | null {
	if (!birthDate) return null;
	const birth = new Date(birthDate);
	if (Number.isNaN(birth.getTime())) return null;

	const now = new Date();
	let age = now.getFullYear() - birth.getFullYear();
	const monthDiff = now.getMonth() - birth.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
		age--;
	}
	return age;
}

async function fetchPortalUser(token: string): Promise<PortalUser> {
	const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
	const res = await fetch(`${baseUrl}/api/auth/me`, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!res.ok) {
		throw new Error("Failed to fetch user data");
	}

	const data = await res.json();
	return data.user as PortalUser;
}

export function PortalProvider({ children }: { children: ReactNode }) {
	const [token, setToken] = useState<string | null>(null);
	const queryClient = useQueryClient();

	useEffect(() => {
		const currentToken = localStorage.getItem("auth_token");
		setToken(currentToken);
	}, []);

	const {
		data: user,
		isLoading: userLoading,
		error: userError,
		refetch,
	} = useQuery({
		queryKey: portalKeys.user(token),
		queryFn: () => fetchPortalUser(token!),
		enabled: !!token,
		staleTime: 1000 * 60 * 10, // 10 minutes
	});

	const refresh = useCallback(async () => {
		const currentToken = localStorage.getItem("auth_token");
		setToken(currentToken);
		if (currentToken) {
			await refetch();
		}
	}, [refetch]);

	const age = useMemo(() => calculateAge(user?.birthDate), [user?.birthDate]);

	const value = useMemo<PortalContextValue>(
		() => ({
			token,
			user: user ?? null,
			age,
			loading: token ? userLoading : false,
			error: userError instanceof Error ? userError.message : null,
			refresh,
		}),
		[token, user, age, userLoading, userError, refresh],
	);

	return (
		<PortalContext.Provider value={value}>{children}</PortalContext.Provider>
	);
}

export function usePortal() {
	const ctx = useContext(PortalContext);
	if (!ctx) {
		throw new Error("usePortal must be used within PortalProvider");
	}
	return ctx;
}

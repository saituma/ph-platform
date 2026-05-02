import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_ID = "cf-turnstile-script";

declare global {
	interface Window {
		turnstile?: {
			render: (
				container: HTMLElement,
				options: {
					sitekey: string;
					callback?: (token: string) => void;
					"error-callback"?: () => void;
					"expired-callback"?: () => void;
					theme?: "light" | "dark" | "auto";
					size?: "normal" | "flexible" | "compact";
					action?: string;
				},
			) => string;
			remove: (widgetId: string) => void;
			reset: (widgetId?: string) => void;
		};
	}
}

function loadScript(): Promise<void> {
	if (typeof window === "undefined") return Promise.resolve();
	if (window.turnstile) return Promise.resolve();
	const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
	if (existing) {
		return new Promise((resolve) => {
			if (window.turnstile) return resolve();
			existing.addEventListener("load", () => resolve(), { once: true });
		});
	}
	return new Promise((resolve, reject) => {
		const s = document.createElement("script");
		s.id = SCRIPT_ID;
		s.src = SCRIPT_SRC;
		s.async = true;
		s.defer = true;
		s.onload = () => resolve();
		s.onerror = () => reject(new Error("Failed to load Turnstile"));
		document.head.appendChild(s);
	});
}

export interface TurnstileProps {
	siteKey: string;
	onVerify: (token: string) => void;
	onExpire?: () => void;
	onError?: () => void;
	action?: string;
	theme?: "light" | "dark" | "auto";
	className?: string;
}

export function Turnstile({
	siteKey,
	onVerify,
	onExpire,
	onError,
	action,
	theme = "auto",
	className,
}: TurnstileProps) {
	const ref = useRef<HTMLDivElement | null>(null);
	const widgetIdRef = useRef<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		loadScript()
			.then(() => {
				if (cancelled || !ref.current || !window.turnstile) return;
				widgetIdRef.current = window.turnstile.render(ref.current, {
					sitekey: siteKey,
					theme,
					action,
					callback: (token) => onVerify(token),
					"expired-callback": () => onExpire?.(),
					"error-callback": () => onError?.(),
				});
			})
			.catch(() => onError?.());
		return () => {
			cancelled = true;
			if (widgetIdRef.current && window.turnstile) {
				try {
					window.turnstile.remove(widgetIdRef.current);
				} catch {
					// noop
				}
			}
		};
	}, [siteKey, theme, action, onVerify, onExpire, onError]);

	return <div ref={ref} className={className} />;
}

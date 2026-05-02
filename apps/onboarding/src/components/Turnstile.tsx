import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SCRIPT_ID = "cf-turnstile-script";
const LOAD_TIMEOUT_MS = 15000;

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
		return new Promise((resolve, reject) => {
			const startedAt = Date.now();
			let intervalId: number | undefined;
			let timeoutId: number | undefined;
			const cleanup = () => {
				if (intervalId) window.clearInterval(intervalId);
				if (timeoutId) window.clearTimeout(timeoutId);
				existing.removeEventListener("load", onLoad);
				existing.removeEventListener("error", onError);
			};
			const onLoad = () => {
				if (!window.turnstile) return;
				cleanup();
				resolve();
			};
			const onError = () => {
				cleanup();
				reject(new Error("Failed to load Turnstile"));
			};

			if (window.turnstile) return resolve();
			existing.addEventListener("load", onLoad, { once: true });
			existing.addEventListener("error", onError, { once: true });
			intervalId = window.setInterval(() => {
				if (window.turnstile) {
					cleanup();
					resolve();
					return;
				}
				if (Date.now() - startedAt >= LOAD_TIMEOUT_MS) {
					cleanup();
					reject(new Error("Turnstile initialization timed out"));
				}
			}, 100);
			timeoutId = window.setTimeout(() => {
				if (window.turnstile) return;
				cleanup();
				reject(new Error("Turnstile initialization timed out"));
			}, LOAD_TIMEOUT_MS + 500);
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
		const timeoutId = window.setTimeout(() => {
			s.remove();
			reject(new Error("Turnstile load timed out"));
		}, LOAD_TIMEOUT_MS);
		s.onload = () => {
			window.clearTimeout(timeoutId);
			resolve();
		};
		s.onerror = () => {
			window.clearTimeout(timeoutId);
			reject(new Error("Failed to load Turnstile"));
		};
		document.head.appendChild(s);
	});
}

export interface TurnstileProps {
	siteKey: string;
	onVerify: (token: string) => void;
	onExpire?: () => void;
	onError?: () => void;
	onReady?: () => void;
	action?: string;
	theme?: "light" | "dark" | "auto";
	className?: string;
}

export function Turnstile({
	siteKey,
	onVerify,
	onExpire,
	onError,
	onReady,
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
				onReady?.();
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
	}, [siteKey, theme, action, onVerify, onExpire, onError, onReady]);

	return <div ref={ref} className={className} />;
}

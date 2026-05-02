"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";

import { Alert, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardPanel, CardFooter } from "../../components/ui/card";
import { Field, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Spinner } from "../../components/ui/spinner";

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileFailed, setTurnstileFailed] = useState(false);
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const turnstileSiteKey = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim();
  const turnstileLogPrefix = "[turnstile]";

  useEffect(() => {
    if (!turnstileSiteKey) {
      console.error(`${turnstileLogPrefix} missing NEXT_PUBLIC_TURNSTILE_SITE_KEY`);
      return;
    }
    console.info(`${turnstileLogPrefix} init`, {
      host: window.location.hostname,
      origin: window.location.origin,
      siteKeyPrefix: `${turnstileSiteKey.slice(0, 8)}...`,
      siteKeySuffix: `...${turnstileSiteKey.slice(-6)}`,
      siteKeyLength: turnstileSiteKey.length,
    });
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !turnstileRef.current || !window.turnstile) return;
      console.info(`${turnstileLogPrefix} rendering widget`);
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token) => {
          console.info(`${turnstileLogPrefix} callback success`, {
            tokenLength: token.length,
          });
          setTurnstileToken(token);
          setTurnstileFailed(false);
          setTurnstileReady(true);
        },
        "expired-callback": () => {
          console.warn(`${turnstileLogPrefix} token expired`);
          setTurnstileToken(null);
        },
        "error-callback": () => {
          console.error(`${turnstileLogPrefix} error-callback fired`);
          setTurnstileFailed(true);
          setTurnstileToken(null);
          setTurnstileReady(true);
        },
      });
      console.info(`${turnstileLogPrefix} widget rendered`, {
        widgetId: widgetIdRef.current,
      });
      setTurnstileReady(true);
    };

    const existing = document.getElementById(TURNSTILE_SCRIPT_ID) as
      | HTMLScriptElement
      | null;
    if (window.turnstile) {
      console.info(`${turnstileLogPrefix} api already available`);
      renderWidget();
    } else if (existing) {
      console.info(`${turnstileLogPrefix} waiting for existing script load`);
      existing.addEventListener("load", renderWidget, { once: true });
      existing.addEventListener(
        "error",
        () => {
          console.error(`${turnstileLogPrefix} existing script failed to load`);
          setTurnstileFailed(true);
        },
        { once: true },
      );
    } else {
      console.info(`${turnstileLogPrefix} injecting api script`);
      const script = document.createElement("script");
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      script.onerror = () => {
        console.error(`${turnstileLogPrefix} script load error`, {
          src: TURNSTILE_SCRIPT_SRC,
        });
        setTurnstileFailed(true);
      };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          console.warn(`${turnstileLogPrefix} failed to remove widget`, {
            widgetId: widgetIdRef.current,
          });
        }
      }
    };
  }, [turnstileSiteKey]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (turnstileSiteKey && !turnstileFailed && !turnstileToken) {
      console.warn(`${turnstileLogPrefix} submit blocked: missing token`, {
        ready: turnstileReady,
        failed: turnstileFailed,
      });
      setError("Please complete the verification challenge.");
      return;
    }
    setLoading(true);

    try {
      const csrfToken = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("csrfToken="))
        ?.split("=")[1];
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({ email, password, turnstileToken }),
      });
      console.info(`${turnstileLogPrefix} login response`, { status: res.status });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Login failed");
      }

      router.replace("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Branding above card */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <img
            src="/ph.jpg"
            alt="PH Performance"
            className="h-16 w-16 rounded-2xl object-cover shadow-md"
          />
        </div>

        <Card>
          <CardHeader className="items-center text-center pb-2">
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription>Sign in to access the dashboard</CardDescription>
          </CardHeader>

          <CardPanel className="pt-4">
            <form className="space-y-5" onSubmit={onSubmit}>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>

              {error ? (
                <Alert variant="error">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              {turnstileSiteKey ? (
                <div className="space-y-2">
                  <div ref={turnstileRef} />
                  {!turnstileReady ? (
                    <p className="text-xs text-muted-foreground">Loading verification challenge…</p>
                  ) : null}
                </div>
              ) : (
                <Alert variant="error">
                  <AlertDescription>
                    Missing `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in web environment.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading || (Boolean(turnstileSiteKey) && !turnstileFailed && !turnstileToken)
                }
              >
                {loading ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                {loading ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </CardPanel>

          <CardFooter className="justify-center pt-2 pb-5">
            <p className="text-xs text-muted-foreground">
              PH Performance &mdash; Admin Portal
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

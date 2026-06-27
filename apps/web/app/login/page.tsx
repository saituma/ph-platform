"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";

import { Alert, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardPanel, CardFooter } from "../../components/ui/card";
import { Field, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Spinner } from "../../components/ui/spinner";

function readCookieValue(name: string): string {
  if (typeof document === "undefined") return "";
  const values = document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`))
    .map((part) => part.slice(name.length + 1));
  const raw = values.length ? values[values.length - 1] : "";
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Double-submit CSRF: cookie value just needs to equal the request header value.
  // Generate client-side if middleware hasn't set it yet — safe because same-origin
  // policy prevents a cross-origin attacker from reading or setting this cookie.
  useEffect(() => {
    if (!readCookieValue("csrfToken")) {
      const token = crypto.randomUUID();
      document.cookie = `csrfToken=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
    }
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const csrfToken = readCookieValue("csrfToken");
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({ email, password }),
      });
      const resBody = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(resBody?.error ?? "Login failed");
      }

      if (resBody?.ok) router.replace("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center px-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/8%,transparent_50%)]" />
      <div className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-1 shadow-lg shadow-primary/10 ring-1 ring-primary/20">
            <img
              src="/ph.jpg"
              alt="PH Performance"
              className="h-16 w-16 rounded-xl object-cover"
            />
          </div>
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

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";

import { Alert, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardPanel, CardFooter } from "../../components/ui/card";
import { Field, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { Spinner } from "../../components/ui/spinner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
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
        body: JSON.stringify({ email, password }),
      });

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

              <Button type="submit" className="w-full" disabled={loading}>
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

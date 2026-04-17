/**
 * Better Auth on the Worker → HS256 app JWT (same claims as Express `createLocalToken`).
 */
export async function signInWithWorkerAndExchange(input: {
  authBaseUrl: string;
  email: string;
  password: string;
}): Promise<{
  accessToken: string;
  idToken: string;
  refreshToken: string | null;
  expiresIn?: number;
}> {
  const base = input.authBaseUrl.replace(/\/+$/, "");
  const signInRes = await fetch(`${base}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: input.email, password: input.password }),
  });

  const signInText = await signInRes.text();
  let signInJson: Record<string, unknown> | null = null;
  try {
    signInJson = signInText ? (JSON.parse(signInText) as Record<string, unknown>) : null;
  } catch {
    signInJson = null;
  }

  if (!signInRes.ok) {
    const msg =
      (typeof signInJson?.message === "string" && signInJson.message) ||
      (typeof signInJson?.error === "string" && signInJson.error) ||
      signInText ||
      "Sign-in failed";
    throw new Error(msg);
  }

  const bearerToken =
    signInRes.headers.get("set-auth-token")?.trim() ||
    (typeof signInJson?.token === "string" ? signInJson.token : null);

  if (!bearerToken) {
    throw new Error("Missing session token from auth server (set-auth-token).");
  }

  const tokenRes = await fetch(`${base}/api/app/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  const tokenText = await tokenRes.text();
  let tokenJson: Record<string, unknown> | null = null;
  try {
    tokenJson = tokenText ? (JSON.parse(tokenText) as Record<string, unknown>) : null;
  } catch {
    tokenJson = null;
  }

  if (!tokenRes.ok) {
    const msg =
      (typeof tokenJson?.error === "string" && tokenJson.error) ||
      tokenText ||
      "Token exchange failed";
    throw new Error(msg);
  }

  const access =
    (typeof tokenJson?.accessToken === "string" && tokenJson.accessToken) ||
    (typeof tokenJson?.idToken === "string" && tokenJson.idToken);
  if (!access) {
    throw new Error("Invalid token exchange response");
  }

  return {
    accessToken: access,
    idToken: access,
    refreshToken:
      typeof tokenJson?.refreshToken === "string" ? tokenJson.refreshToken : null,
    expiresIn: typeof tokenJson?.expiresIn === "number" ? tokenJson.expiresIn : undefined,
  };
}

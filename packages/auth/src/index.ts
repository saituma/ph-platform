import type { UserRole } from "@ph/roles";

export const APP_SESSION_COOKIE_NAME = "ph_app_session";
export const ONBOARDING_AUTH_TOKEN_STORAGE_KEY = "ph_auth_token";
export const PARENT_AUTH_TOKEN_STORAGE_KEY = "ph_parent_auth_token";
export const WEB_ACCESS_TOKEN_COOKIE_NAME = "accessToken";
export const WEB_CLIENT_ACCESS_TOKEN_COOKIE_NAME = "accessTokenClient";
export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
export const CSRF_COOKIE_NAME = "__csrf";
export const WEB_CSRF_COOKIE_NAME = "csrfToken";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type AuthTokenResponse = {
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
};

export type LoginResponse = AuthTokenResponse & {
  user?: {
    id?: number | string;
    email?: string;
    name?: string;
    role?: UserRole | string | null;
  };
  role?: UserRole | string | null;
};

export type TokenStatus = {
  authenticated: boolean;
  expiresAt: number | null;
};

export type BrowserAuthState = TokenStatus & {
  loading?: boolean;
};

export type AuthenticatedSessionResponse = {
  authenticated: true;
  expiresAt?: number | null;
};

export type UnauthenticatedSessionResponse = {
  authenticated: false;
  expiresAt?: null;
};

export type SessionStatusResponse = AuthenticatedSessionResponse | UnauthenticatedSessionResponse;


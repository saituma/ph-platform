import type { UserRole } from "../lib/user-roles";

/** @deprecated Prefer importing `UserRole` from `../lib/user-roles`. */
export type AppRole = UserRole;

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: AppRole;
        email: string;
        name: string;
        sub: string;
        profilePicture?: string | null;
      };
    }
  }
}

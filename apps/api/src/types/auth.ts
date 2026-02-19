export type AppRole = "guardian" | "athlete" | "coach" | "admin" | "superAdmin";

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

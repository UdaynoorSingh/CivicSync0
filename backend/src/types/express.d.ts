/**
 * Augments the Express Request interface to include `req.user`.
 * This is set by authGuard after JWT verification.
 *
 * Note: The `export {}` is required to make this a module file
 *       so that `declare global` compiles correctly.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: "citizen" | "admin" | "superadmin" | "head_admin";
        districtId: string;
        departmentId?: string;
      };
    }
  }
}

export {};

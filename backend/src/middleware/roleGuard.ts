import { Request, Response, NextFunction } from "express";
import { TokenPayload } from "../utils/generateToken";

type AllowedRole = TokenPayload["role"];

/**
 * Factory middleware — restricts a route to specific roles.
 * Must be used AFTER `authGuard` (req.user must already be set).
 *
 * Usage:  router.get('/admin/me', authGuard, roleGuard('admin'), adminGetMe)
 *         router.get('/super',    authGuard, roleGuard('superadmin'), ...)
 */
export const roleGuard = (...allowedRoles: AllowedRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: [${allowedRoles.join(", ")}].`,
      });
      return;
    }
    next();
  };
};

/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/generateToken";

/**
 * Protects any route that requires a logged-in user or admin.
 * Reads the JWT from the httpOnly cookie `civicsync_token`,
 * verifies it, and attaches the decoded payload to `req.user`.
 */
export const authGuard = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const cookieToken = req.cookies?.civicsync_token as string | undefined;
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : undefined;
  const token = cookieToken || bearerToken;

  if (!token) {
    res
      .status(401)
      .json({ success: false, message: "Not authenticated. Please log in." });
    return;
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({
      success: false,
      message: "Session expired or invalid. Please log in again.",
    });
    return;
  }

  req.user = decoded;
  next();
};

import jwt from "jsonwebtoken";
import { Response } from "express";

export interface TokenPayload {
  id: string;
  role: "citizen" | "admin" | "superadmin" | "head_admin";
  districtId: string;
  departmentId?: string; // admin only
}

const secret = (): string => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not set");
  return process.env.JWT_SECRET;
};

/** Signs a JWT with the given payload and TTL (e.g. '24h', '8h'). */
export const signToken = (payload: TokenPayload, ttl: string): string => {
  return jwt.sign(payload, secret(), { expiresIn: ttl } as jwt.SignOptions);
};

/** Verifies a JWT and returns the decoded payload, or null on failure. */
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, secret()) as TokenPayload;
  } catch {
    return null;
  }
};

/**
 * Sets a signed JWT as an httpOnly cookie on the response.
 * Cookie options:
 *   - httpOnly  → not accessible by JS (prevents XSS theft)
 *   - secure    → HTTPS only in production
 *   - sameSite  → 'strict' to block CSRF
 *   - maxAge    → parsed from ttl string (e.g. '24h' → 86400000 ms)
 */
export const setTokenCookie = (
  res: Response,
  token: string,
  ttl: string,
): void => {
  const ms = parseTTLtoMs(ttl);
  res.cookie("civicsync_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ms,
  });
};

/** Clears the auth cookie (logout). */
export const clearTokenCookie = (res: Response): void => {
  res.clearCookie("civicsync_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
};

/** Converts a TTL string like '24h' or '8h' to milliseconds. */
const parseTTLtoMs = (ttl: string): number => {
  const unit = ttl.slice(-1);
  const value = parseInt(ttl.slice(0, -1), 10);
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? 3600000);
};

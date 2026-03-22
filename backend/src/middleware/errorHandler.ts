import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
}

/**
 * Global Express error handler — must be registered LAST in the middleware chain.
 * Returns a consistent { success: false, message } JSON response.
 */
export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  const statusCode = err.statusCode ?? 500;
  const message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "Internal server error"
      : err.message || "Something went wrong";

  if (statusCode === 500) {
    console.error("❌ Unhandled error:", err);
  }

  res.status(statusCode).json({ success: false, message });
};

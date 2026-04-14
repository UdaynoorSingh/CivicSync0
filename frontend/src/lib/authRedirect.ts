/** Passed through login → OTP so the user returns to the intended screen after auth. */
export type PostAuthRedirect = {
  path: string;
  state?: Record<string, unknown>;
};

export function isCitizenUser(
  isAuthenticated: boolean,
  role: string,
): boolean {
  return isAuthenticated && role === "citizen";
}

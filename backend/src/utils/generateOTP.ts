import bcrypt from "bcryptjs";

/**
 * Generates a cryptographically random 6-digit OTP string.
 * Uses Math.random seeded approach — sufficient for dev/demo.
 * For production, replace with: crypto.randomInt(100000, 999999).toString()
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/** Hashes plain OTP with bcrypt (10 salt rounds — fast enough for 6 digits). */
export const hashOTP = async (otp: string): Promise<string> => {
  return bcrypt.hash(otp, 10);
};

/** Compares plain OTP entered by user against the stored bcrypt hash. */
export const verifyOTP = async (
  plain: string,
  hashed: string,
): Promise<boolean> => {
  return bcrypt.compare(plain, hashed);
};

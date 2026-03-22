/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from "express";
import { User, District } from "../models";
import { generateOTP, hashOTP, verifyOTP } from "../utils/generateOTP";
import { getFirebaseAdminAuth } from "../config/firebaseAdmin";
import {
  signToken,
  setTokenCookie,
  clearTokenCookie,
} from "../utils/generateToken";

const CITIZEN_TTL = process.env.JWT_CITIZEN_TTL ?? "24h";
const FIREBASE_LOGIN_TTL = "7d";
const MAX_OTP_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const isDev = process.env.NODE_ENV !== "production";

const normalizeIndianPhone = (input: string): string => {
  const trimmed = input.trim();
  if (trimmed.startsWith("+")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return trimmed;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/send-otp
// ─────────────────────────────────────────────────────────────────────────────
export const sendOTP = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { mobile } = req.body as { mobile?: string };

    if (!mobile || !/^\+?[0-9]{10,13}$/.test(mobile)) {
      res
        .status(400)
        .json({ success: false, message: "Valid mobile number is required." });
      return;
    }

    // Find existing user or create a stub (name & address filled on first login)
    let user = await User.findOne({ mobile });
    if (!user) {
      // New citizen — profile (district, address) filled in after first login
      user = new User({ mobile, name: "Citizen" });
    }

    // Guard: account blocked?
    if (user.isBlocked && user.blockedUntil && user.blockedUntil > new Date()) {
      const remaining = Math.ceil(
        (user.blockedUntil.getTime() - Date.now()) / 60000,
      );
      res.status(429).json({
        success: false,
        message: `Account locked due to too many failed attempts. Try again in ${remaining} minute(s).`,
      });
      return;
    }

    // Generate & hash OTP
    const plain = generateOTP();
    const hashed = await hashOTP(plain);

    user.otp = hashed;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    user.otpAttempts = 0;
    user.isBlocked = false;
    user.blockedUntil = undefined;

    await user.save();

    // DEV: print OTP loudly in console and optionally return it in response.
    if (isDev) {
      process.stdout.write(`\n[DEV OTP][CITIZEN] ${mobile} -> ${plain}\n`);
    }

    res.status(200).json({
      success: true,
      message: "OTP generated. Check server console.",
      ...(isDev ? { devOtp: plain } : {}),
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// ─────────────────────────────────────────────────────────────────────────────
export const verifyOTPHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { mobile, otp } = req.body as { mobile?: string; otp?: string };

    if (!mobile || !otp) {
      res
        .status(400)
        .json({ success: false, message: "Mobile and OTP are required." });
      return;
    }

    // Fetch with hidden OTP fields
    const user = await User.findOne({ mobile }).select(
      "+otp +otpExpiry +otpAttempts +isBlocked",
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found. Please request an OTP first.",
      });
      return;
    }

    // Blocked?
    if (user.isBlocked && user.blockedUntil && user.blockedUntil > new Date()) {
      const remaining = Math.ceil(
        (user.blockedUntil.getTime() - Date.now()) / 60000,
      );
      res.status(429).json({
        success: false,
        message: `Account locked. Try again in ${remaining} minute(s).`,
      });
      return;
    }

    // OTP present & not expired?
    if (!user.otp || !user.otpExpiry || user.otpExpiry < new Date()) {
      res.status(410).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
      return;
    }

    // Verify hash
    const isMatch = await verifyOTP(otp, user.otp);

    if (!isMatch) {
      user.otpAttempts += 1;

      if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        user.isBlocked = true;
        user.blockedUntil = new Date(Date.now() + BLOCK_DURATION_MS);
        await user.save();
        res.status(429).json({
          success: false,
          message: "Too many failed attempts. Account locked for 15 minutes.",
        });
        return;
      }

      await user.save();
      res.status(401).json({
        success: false,
        message: `Incorrect OTP. ${MAX_OTP_ATTEMPTS - user.otpAttempts} attempt(s) remaining.`,
      });
      return;
    }

    // ✅ OTP valid — clear OTP fields & issue JWT
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    user.isBlocked = false;
    user.blockedUntil = undefined;
    await user.save();

    const token = signToken(
      {
        id: user.id as string,
        role: "citizen",
        districtId: user.district?.toString() ?? "",
      },
      CITIZEN_TTL,
    );

    setTokenCookie(res, token, CITIZEN_TTL);

    await user.populate("district", "name state");

    res.status(200).json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        district: user.district,
        preferredLanguage: user.preferredLanguage,
        address: user.address,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/firebase-login
export const firebaseLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { firebaseToken } = req.body as { firebaseToken?: string };

    if (!firebaseToken) {
      res.status(400).json({
        success: false,
        message: "firebaseToken is required.",
      });
      return;
    }

    let decoded: { phone_number?: string };
    try {
      decoded = await getFirebaseAdminAuth().verifyIdToken(firebaseToken, true);
    } catch {
      res.status(401).json({
        success: false,
        message: "Invalid or expired Firebase token.",
      });
      return;
    }
    const phoneFromToken = decoded.phone_number;

    if (!phoneFromToken) {
      res.status(401).json({
        success: false,
        message: "Invalid Firebase token. Phone number claim missing.",
      });
      return;
    }

    const mobile = normalizeIndianPhone(phoneFromToken);

    let user = await User.findOne({ mobile });
    if (!user) {
      user = await User.create({
        mobile,
        name: "Citizen",
        preferredLanguage: "en",
      });
    }

    const token = signToken(
      {
        id: user.id as string,
        role: "citizen",
        districtId: user.district?.toString() ?? "",
      },
      FIREBASE_LOGIN_TTL,
    );

    setTokenCookie(res, token, FIREBASE_LOGIN_TTL);

    await user.populate("district", "name state");

    res.status(200).json({
      success: true,
      message: "Firebase login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        district: user.district,
        preferredLanguage: user.preferredLanguage,
        address: user.address,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me  [authGuard]
// ─────────────────────────────────────────────────────────────────────────────
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id).populate(
      "district",
      "name state",
    );

    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout  [authGuard]
// ─────────────────────────────────────────────────────────────────────────────
export const logout = (_req: Request, res: Response): void => {
  clearTokenCookie(res);
  res.status(200).json({ success: true, message: "Logged out successfully." });
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/auth/profile  [authGuard]
// Editable: name, preferredLanguage, address, districtId
// ─────────────────────────────────────────────────────────────────────────────
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, preferredLanguage, districtId, districtName, address } = req.body as {
      name?: string;
      preferredLanguage?: string;
      districtId?: string;
      districtName?: string;
      address?: {
        houseNo?: string;
        street?: string;
        landmark?: string;
        city?: string;
        state?: string;
        pincode?: string;
      };
    };

    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) {
        res
          .status(400)
          .json({ success: false, message: "Name cannot be empty." });
        return;
      }
      user.name = trimmed;
    }

    if (preferredLanguage !== undefined) {
      if (!["en", "hi", "as"].includes(preferredLanguage)) {
        res.status(400).json({ success: false, message: "Invalid language." });
        return;
      }
      user.preferredLanguage = preferredLanguage as "en" | "hi" | "as";
    }

    if (districtName) {
      const stateName = districtName.trim();
      let stateRecord = await District.findOne({ name: new RegExp(`^${stateName}$`, "i") });
      if (!stateRecord) {
        stateRecord = await District.create({
          name: stateName,
          state: stateName,
          stateCode: stateName.substring(0, 2).toUpperCase(),
          isActive: true,
        });
      }
      user.district = stateRecord._id as typeof user.district;
    } else if (districtId !== undefined) {
      const stateRecord = await District.findById(districtId).lean();
      if (!stateRecord) {
        res.status(400).json({ success: false, message: "Invalid district." });
        return;
      }
      user.district = stateRecord._id as typeof user.district;
    }

    if (address !== undefined) {
      user.address = {
        houseNo: address.houseNo?.trim() ?? user.address?.houseNo,
        street: address.street?.trim() ?? user.address?.street,
        landmark: address.landmark?.trim() ?? user.address?.landmark,
        city: address.city?.trim() ?? user.address?.city,
        state: address.state?.trim() ?? user.address?.state,
        pincode: address.pincode?.trim() ?? user.address?.pincode,
      };
    }

    await user.save();
    await user.populate("district", "name state");

    // Re-issue JWT to immediately refresh `districtId` scope without requiring re-login
    const token = signToken(
      {
        id: user.id as string,
        role: "citizen",
        districtId: user.district?._id?.toString() ?? "",
      },
      CITIZEN_TTL,
    );
    setTokenCookie(res, token, CITIZEN_TTL);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        preferredLanguage: user.preferredLanguage,
        district: user.district,
        address: user.address,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/districts  [public]
// ─────────────────────────────────────────────────────────────────────────────
export const getDistricts = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const districts = await District.find({ isActive: true })
      .select("name state")
      .sort({ state: 1, name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      districts: districts.map((d) => ({
        id: d._id,
        name: d.name,
        state: d.state,
      })),
    });
  } catch (err) {
    next(err);
  }
};

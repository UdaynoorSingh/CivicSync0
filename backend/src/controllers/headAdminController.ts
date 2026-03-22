import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { isValidObjectId } from "mongoose";
import { Admin, Department, District, Feedback } from "../models";
import { generateOTP, hashOTP, verifyOTP } from "../utils/generateOTP";
import { getFirebaseAdminAuth } from "../config/firebaseAdmin";
import {
  clearTokenCookie,
  setTokenCookie,
  signToken,
} from "../utils/generateToken";

type HeadAdminOtpRecord = {
  otpHash: string;
  otpExpiry: Date;
  attempts: number;
  blockedUntil?: Date;
};

const HEAD_ADMIN_TTL = process.env.JWT_HEAD_ADMIN_TTL ?? "8h";
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000;
const OTP_STORE = new Map<string, HeadAdminOtpRecord>();
const PAGE_SIZE = 20;
const isDev = process.env.NODE_ENV !== "production";

const normalizePhone = (value: string): string => value.replace(/\D/g, "");

const getConfiguredHeadAdminPhone = (): string =>
  normalizePhone(process.env.HEAD_ADMIN_PHONE ?? "");

const getDefaultDistrict = async () => {
  const configured = process.env.HEAD_ADMIN_DEFAULT_DISTRICT;

  if (configured) {
    const byId = isValidObjectId(configured)
      ? await District.findById(configured).lean()
      : null;
    if (byId) return byId;

    const byName = await District.findOne({
      name: new RegExp(`^${configured}$`, "i"),
      isActive: true,
    }).lean();
    if (byName) return byName;
  }

  return District.findOne({ isActive: true }).sort({ name: 1 }).lean();
};

export const sendHeadAdminOTP = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const configured = getConfiguredHeadAdminPhone();
    const mobile = normalizePhone((req.body as { mobile?: string }).mobile ?? "");

    if (!configured) {
      res.status(500).json({
        success: false,
        message: "HEAD_ADMIN_PHONE is not configured in backend .env.",
      });
      return;
    }

    if (!mobile || mobile !== configured) {
      res.status(401).json({
        success: false,
        message: "Unauthorized phone number for head admin login.",
      });
      return;
    }

    const existing = OTP_STORE.get(mobile);
    if (existing?.blockedUntil && existing.blockedUntil > new Date()) {
      const remaining = Math.ceil(
        (existing.blockedUntil.getTime() - Date.now()) / 60000,
      );
      res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${remaining} minute(s).`,
      });
      return;
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);

    OTP_STORE.set(mobile, {
      otpHash,
      otpExpiry: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
    });

    if (isDev) {
      process.stdout.write(`\n[DEV OTP][HEAD_ADMIN] ${mobile} -> ${otp}\n`);
    }

    res.status(200).json({
      success: true,
      message: "OTP generated. Check backend console.",
      ...(isDev ? { devOtp: otp } : {}),
    });
  } catch (err) {
    next(err);
  }
};

export const verifyHeadAdminOTP = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const configured = getConfiguredHeadAdminPhone();
    const { otp } = req.body as { otp?: string };
    const mobile = normalizePhone((req.body as { mobile?: string }).mobile ?? "");

    if (!configured) {
      res.status(500).json({
        success: false,
        message: "HEAD_ADMIN_PHONE is not configured in backend .env.",
      });
      return;
    }

    if (!mobile || mobile !== configured || !otp) {
      res
        .status(400)
        .json({ success: false, message: "Mobile and OTP are required." });
      return;
    }

    const existing = OTP_STORE.get(mobile);
    if (!existing) {
      res.status(410).json({
        success: false,
        message: "OTP expired. Please request a new one.",
      });
      return;
    }

    if (existing.blockedUntil && existing.blockedUntil > new Date()) {
      const remaining = Math.ceil(
        (existing.blockedUntil.getTime() - Date.now()) / 60000,
      );
      res.status(429).json({
        success: false,
        message: `Account locked. Try again in ${remaining} minute(s).`,
      });
      return;
    }

    if (existing.otpExpiry < new Date()) {
      OTP_STORE.delete(mobile);
      res.status(410).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
      return;
    }

    const isMatch = await verifyOTP(otp, existing.otpHash);
    if (!isMatch) {
      existing.attempts += 1;
      if (existing.attempts >= MAX_OTP_ATTEMPTS) {
        existing.blockedUntil = new Date(Date.now() + BLOCK_DURATION_MS);
      }
      OTP_STORE.set(mobile, existing);

      res.status(401).json({
        success: false,
        message:
          existing.attempts >= MAX_OTP_ATTEMPTS
            ? "Too many failed attempts. Account locked for 15 minutes."
            : `Incorrect OTP. ${MAX_OTP_ATTEMPTS - existing.attempts} attempt(s) remaining.`,
      });
      return;
    }

    OTP_STORE.delete(mobile);

    const token = signToken(
      {
        id: mobile,
        role: "head_admin",
        districtId: "",
      },
      HEAD_ADMIN_TTL,
    );
    setTokenCookie(res, token, HEAD_ADMIN_TTL);

    res.status(200).json({
      success: true,
      message: "Head admin login successful.",
      admin: {
        id: mobile,
        name: "Head Admin",
        mobile,
        role: "head_admin",
      },
    });
  } catch (err) {
    next(err);
  }
};

export const headAdminFirebaseLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const configured = getConfiguredHeadAdminPhone();
    const { firebaseToken } = req.body as { firebaseToken?: string };

    if (!configured) {
      res.status(500).json({
        success: false,
        message: "HEAD_ADMIN_PHONE is not configured in backend .env.",
      });
      return;
    }

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
    const mobile = normalizePhone(phoneFromToken ?? "");

    if (!mobile || mobile !== configured) {
      res.status(401).json({
        success: false,
        message: "Unauthorized phone number for head admin login.",
      });
      return;
    }

    const token = signToken(
      {
        id: mobile,
        role: "head_admin",
        districtId: "",
      },
      HEAD_ADMIN_TTL,
    );
    setTokenCookie(res, token, HEAD_ADMIN_TTL);

    res.status(200).json({
      success: true,
      message: "Head admin Firebase login successful.",
      token,
      admin: {
        id: mobile,
        name: "Head Admin",
        mobile,
        role: "head_admin",
      },
    });
  } catch (err) {
    next(err);
  }
};

export const headAdminLogout = (_req: Request, res: Response): void => {
  clearTokenCookie(res);
  res.status(200).json({ success: true, message: "Logged out successfully." });
};

export const getHeadAdminMe = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const configured = getConfiguredHeadAdminPhone();
  const mobile = req.user?.id ?? configured;

  res.status(200).json({
    success: true,
    admin: {
      id: req.user?.id ?? mobile,
      name: "Head Admin",
      mobile,
      role: "head_admin" as const,
    },
  });
};

export const getHeadAdminMeta = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const departments = await Department.find({ isActive: true })
      .select("name code")
      .sort({ name: 1 })
      .lean();

    const districtsList = await District.find({ isActive: true })
      .select("name state")
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      departments,
      districts: districtsList.map((d) => ({
        id: d._id,
        name: d.name,
        state: d.state,
      })),
    });
  } catch (err) {
    next(err);
  }
};

export const createDepartmentAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { departmentId, stateName, username, password, name } = req.body as {
      departmentId?: string;
      stateName?: string;
      username?: string;
      password?: string;
      name?: string;
    };

    if (!departmentId || !stateName || !username || !password) {
      res.status(400).json({
        success: false,
        message: "departmentId, stateName, username and password are required.",
      });
      return;
    }

    if (!isValidObjectId(departmentId)) {
      res.status(400).json({ success: false, message: "Invalid departmentId." });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
      return;
    }

    const normalizedUsername = username.toLowerCase().trim();
    if (!/^[a-z0-9._-]{3,32}$/.test(normalizedUsername)) {
      res.status(400).json({
        success: false,
        message:
          "Username must be 3-32 chars and can include a-z, 0-9, ., _ and -.",
      });
      return;
    }

    const department = await Department.findById(departmentId).lean();
    if (!department) {
      res.status(404).json({ success: false, message: "Department not found." });
      return;
    }

    // Auto-create the state (District record) if it doesn't exist yet
    let district = await District.findOne({ name: stateName.trim() }).lean();
    if (!district) {
      const stateCode = stateName.trim().substring(0, 2).toUpperCase();
      const created = await District.create({
        name: stateName.trim(),
        state: stateName.trim(),
        stateCode,
        pinCodes: [],
        coordinates: { latitude: 20.5937, longitude: 78.9629 },
        isActive: true,
      });
      district = created.toObject();
    }

    const existingForScope = await Admin.findOne({
      department: department._id,
      district: district._id,
      role: "admin",
    });
    if (existingForScope?.isActive) {
      res.status(409).json({
        success: false,
        message: "An active admin already exists for this department.",
      });
      return;
    }

    const existingUsername = await Admin.findOne({
      username: normalizedUsername,
    }).lean();
    if (
      existingUsername &&
      existingUsername._id.toString() !== existingForScope?._id.toString()
    ) {
      res.status(409).json({
        success: false,
        message: "Username already exists.",
      });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const email = `${normalizedUsername}@civicsync.local`;
    let adminId: string;

    if (existingForScope) {
      existingForScope.name = name?.trim() || `${department.name} Admin`;
      existingForScope.username = normalizedUsername;
      existingForScope.email = email;
      existingForScope.password = hashed;
      existingForScope.isActive = true;
      await existingForScope.save();
      adminId = existingForScope._id.toString();
    } else {
      const admin = await Admin.create({
        name: name?.trim() || `${department.name} Admin`,
        username: normalizedUsername,
        email,
        password: hashed,
        department: department._id,
        district: district._id,
        role: "admin",
        isActive: true,
      });
      adminId = admin._id.toString();
    }

    const populated = await Admin.findById(adminId)
      .select("-password")
      .populate("department", "name code")
      .populate("district", "name state")
      .lean();

    res.status(201).json({
      success: true,
      message: "Department admin created successfully.",
      admin: populated,
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({
        success: false,
        message:
          "Duplicate admin record. This department may already have an admin.",
      });
      return;
    }
    next(err);
  }
};

export const listDepartmentAdmins = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const admins = await Admin.find({ role: "admin", isActive: true })
      .select("-password")
      .sort({ createdAt: -1 })
      .populate("department", "name code")
      .populate("district", "name state")
      .lean();

    res.status(200).json({ success: true, admins });
  } catch (err) {
    next(err);
  }
};

export const removeDepartmentAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid admin id." });
      return;
    }

    const admin = await Admin.findOne({
      _id: id,
      role: "admin",
    });
    if (!admin) {
      res.status(404).json({ success: false, message: "Admin not found." });
      return;
    }
    await Admin.deleteOne({ _id: admin._id });

    res
      .status(200)
      .json({ success: true, message: "Department admin removed successfully." });
  } catch (err) {
    next(err);
  }
};

export const getFeedbackDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10));

    const [feedbacks, total] = await Promise.all([
      Feedback.find({})
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .populate("userId", "name mobile")
        .populate("department", "name code")
        .populate("district", "name state")
        .lean(),
      Feedback.countDocuments({}),
    ]);

    res.status(200).json({
      success: true,
      feedbacks,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        pages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (err) {
    next(err);
  }
};

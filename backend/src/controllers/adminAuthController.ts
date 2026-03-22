import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { Admin } from "../models";
import {
  signToken,
  setTokenCookie,
  clearTokenCookie,
} from "../utils/generateToken";

const ADMIN_TTL = process.env.JWT_ADMIN_TTL ?? "8h";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/login
// ─────────────────────────────────────────────────────────────────────────────
export const adminLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      res
        .status(400)
        .json({
          success: false,
          message: "Username and password are required.",
        });
      return;
    }

    // Fetch with password (excluded by default via select: false)
    const admin = await Admin.findOne({
      username: username.toLowerCase().trim(),
    }).select("+password");

    if (!admin || !admin.isActive) {
      // Generic message — don't reveal whether user exists
      res.status(401).json({ success: false, message: "Invalid credentials." });
      return;
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      res.status(401).json({ success: false, message: "Invalid credentials." });
      return;
    }

    // Update last login timestamp
    admin.lastLogin = new Date();
    await admin.save();

    const token = signToken(
      {
        id: admin.id as string,
        role: admin.role,
        districtId: admin.district.toString(),
        departmentId: admin.department.toString(),
      },
      ADMIN_TTL,
    );

    setTokenCookie(res, token, ADMIN_TTL);

    res.status(200).json({
      success: true,
      message: "Admin login successful.",
      admin: {
        id: admin.id,
        name: admin.name,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        district: admin.district,
        department: admin.department,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/me  [authGuard + roleGuard('admin','superadmin')]
// ─────────────────────────────────────────────────────────────────────────────
export const adminGetMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const admin = await Admin.findById(req.user!.id)
      .populate("district", "name state")
      .populate("department", "name code");

    if (!admin) {
      res.status(404).json({ success: false, message: "Admin not found." });
      return;
    }

    res.status(200).json({ success: true, admin });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/logout  [authGuard]
// ─────────────────────────────────────────────────────────────────────────────
export const adminLogout = (_req: Request, res: Response): void => {
  clearTokenCookie(res);
  res
    .status(200)
    .json({ success: true, message: "Admin logged out successfully." });
};

import { Schema, model, Document, Types } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────────
export type AdminRole = "admin" | "superadmin";

/**
 * Each admin is scoped to ONE department in ONE district.
 * e.g. the Electricity admin for Karnal district can only manage
 * electricity-related complaints and service requests in Karnal.
 *
 * A superadmin has cross-district/cross-department visibility.
 */
export interface IAdmin extends Document {
  name: string;
  username: string; // unique login identifier
  email: string;
  password: string; // bcrypt-hashed

  department: Types.ObjectId; // ref: 'Department'
  district: Types.ObjectId; // ref: 'District'
  role: AdminRole;

  isActive: boolean;
  lastLogin?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const adminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },
    password: { type: String, required: true, select: false },

    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    district: { type: Schema.Types.ObjectId, ref: "District", required: true },
    role: { type: String, enum: ["admin", "superadmin"], default: "admin" },

    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true },
);

// One admin per department per district (enforces the 1-admin-per-dept-per-district rule)
adminSchema.index({ department: 1, district: 1 }, { unique: true });

export const Admin = model<IAdmin>("Admin", adminSchema);

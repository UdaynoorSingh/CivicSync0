import { Schema, model, Document, Types } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────────
export type AdminRole = "admin" | "superadmin";
export type TierLevel = 1 | 2 | 3 | 4;

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

  tier: TierLevel;
  supervisor: Types.ObjectId;

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

    tier: {type: Number, required: true, default: 1},
    supervisor: {type: Schema.Types.ObjectId, ref: "Admin"},
  },
  { timestamps: true },
);

adminSchema.index({ district: 1, department: 1, tier: 1, isActive: 1 });

export const Admin = model<IAdmin>("Admin", adminSchema);

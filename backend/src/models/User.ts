import { Schema, model, Document, Types } from "mongoose";

// ── Sub-types ──────────────────────────────────────────────────────────────────
export interface IUtilityConnection {
  department: Types.ObjectId; // ref: 'Department'
  connectionNumber: string; // e.g. 'PSPCL-4521'
  status: "active" | "inactive" | "suspended";
}

export interface IAddress {
  houseNo?: string;
  street?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

// ── Main Interface ─────────────────────────────────────────────────────────────
export interface IUser extends Document {
  mobile: string;
  name: string;
  aadhaarLastFour?: string; // last 4 digits for display only

  district: Types.ObjectId; // ref: 'District' — used for notification targeting
  address: IAddress;

  /** Existing utility service connections for this citizen */
  utilityConnections: IUtilityConnection[];

  preferredLanguage: "en" | "hi" | "as";

  // OTP fields (hashed before storage)
  otp?: string;
  otpExpiry?: Date;
  otpAttempts: number; // reset after successful login
  isBlocked: boolean; // true after too many failed OTP attempts
  blockedUntil?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const addressSchema = new Schema<IAddress>(
  {
    houseNo: { type: String },
    street: { type: String },
    landmark: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
  },
  { _id: false },
);

const utilityConnectionSchema = new Schema<IUtilityConnection>(
  {
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    connectionNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\+?[0-9]{10,13}$/, "Invalid mobile number"],
    },
    name: { type: String, required: true, trim: true },
    aadhaarLastFour: { type: String, match: /^\d{4}$/ },

    district: { type: Schema.Types.ObjectId, ref: "District" },
    address: { type: addressSchema, default: () => ({}) },

    utilityConnections: { type: [utilityConnectionSchema], default: [] },

    preferredLanguage: {
      type: String,
      enum: ["en", "hi", "as"],
      default: "en",
    },

    otp: { type: String, select: false }, // excluded from default queries
    otpExpiry: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
    blockedUntil: { type: Date },
  },
  { timestamps: true },
);

export const User = model<IUser>("User", userSchema);

import { Schema, model, Document, Types } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────────
export type ComplaintUrgency = "low" | "medium" | "high";
export type ComplaintPriority = "low" | "medium" | "high" | "critical";
export type ComplaintStatus =
  | "submitted"
  | "acknowledged"
  | "in_progress"
  | "escalated"
  | "resolved"
  | "rejected";

export interface IStatusHistoryEntry {
  status: ComplaintStatus;
  updatedBy?: Types.ObjectId; // User or Admin ObjectId
  updatedByModel?: "User" | "Admin";
  note?: string; // admin's remark
  timestamp: Date;
}

/**
 * Complaint reference number format: COMP-YYYYMMDD-XXXXX (e.g. COMP-20260220-00123)
 * Generated in the controller before save.
 *
 * The `location` field uses GeoJSON Point (2dsphere index) to power the
 * complaint heatmap (feature 11). Coordinates are [longitude, latitude].
 *
 * Admin can bump `priority` to 'critical' to escalate (feature 18).
 */
export interface IComplaint extends Document {
  userId: Types.ObjectId; // ref: 'User'
  assignedAdmin?: Types.ObjectId; // ref: 'Admin' — set when acknowledged

  department: Types.ObjectId; // ref: 'Department'
  district: Types.ObjectId; // ref: 'District'

  referenceNumber: string; // unique — COMP-YYYYMMDD-XXXXX

  /** Specific issue type, e.g. 'power_outage' | 'water_leakage' | 'garbage_collection' */
  category: string;

  description: string;
  address: {
    houseNo: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
  };

  location: {
    type: "Point";
    coordinates: [number, number]; 
  };

  photoUrl: string; 
  urgency: ComplaintUrgency; 
  priority: ComplaintPriority; 
  status: ComplaintStatus;
  statusHistory: IStatusHistoryEntry[];

  resolvedAt?: Date;
  feedback?: Types.ObjectId; 

  createdAt: Date;
  updatedAt: Date;
  idempotencyKey?: string;
}

const statusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    status: {
      type: String,
      enum: [
        "submitted",
        "acknowledged",
        "in_progress",
        "escalated",
        "resolved",
        "rejected",
      ],
      required: true,
    },
    updatedBy: { type: Schema.Types.ObjectId },
    updatedByModel: { type: String, enum: ["User", "Admin"] },
    note: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const complaintSchema = new Schema<IComplaint>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedAdmin: { type: Schema.Types.ObjectId, ref: "Admin" },

    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    district: { type: Schema.Types.ObjectId, ref: "District", required: true },

    referenceNumber: { type: String, required: true, unique: true },
    category: { type: String, required: true, trim: true },

    description: { type: String, required: true, trim: true },
    address: {
      houseNo: { type: String, default: "-" },
      street: { type: String, default: "-" },
      landmark: { type: String },
      city: { type: String, default: "-" },
      state: { type: String, default: "-" },
      pincode: { type: String, default: "000000" },
    },

    location: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true }, 
    },

    photoUrl: { type: String, default: "" },
    urgency: { type: String, enum: ["low", "medium", "high"], required: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: function (this: IComplaint) {
        return this.urgency; 
      },
    },
    status: {
      type: String,
      enum: [
        "submitted",
        "acknowledged",
        "in_progress",
        "escalated",
        "resolved",
        "rejected",
      ],
      default: "submitted",
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    resolvedAt: { type: Date },
    feedback: { type: Schema.Types.ObjectId, ref: "Feedback" },
    idempotencyKey: { type: String, unique: true, sparse: true },
    
  },
  { timestamps: true },
);

complaintSchema.index({ location: "2dsphere" });
complaintSchema.index({ district: 1, status: 1 });
complaintSchema.index({ userId: 1, createdAt: -1 });
complaintSchema.index({ assignedAdmin: 1, status: 1 });
complaintSchema.index({ idempotencyKey: 1 });

export const Complaint = model<IComplaint>("Complaint", complaintSchema);

import { Schema, model, Document, Types } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface IEmergencyEntry {
  name: string; // e.g. 'PSPCL Emergency Helpline — Karnal'
  phone: string;
  altPhone?: string;
  email?: string;
  available24x7: boolean;
  serviceHours?: string; // e.g. '9 AM – 6 PM Mon–Sat' (only if not 24x7)
}

/**
 * One document per (district + department) pair.
 * department = null means general district emergencies
 * (police, ambulance, fire, civil administration).
 *
 * Each document holds an array of `entries` so multiple contacts
 * (primary + backup) can be recorded for the same district-department.
 */
export interface IEmergencyDirectory extends Document {
  district: Types.ObjectId; // ref: 'District'
  department?: Types.ObjectId; // ref: 'Department' — null for non-utility emergencies

  category: string; // e.g. 'Police', 'Ambulance', 'Fire', 'Electricity Board'
  entries: IEmergencyEntry[];

  isActive: boolean;
  updatedAt: Date;
  createdAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const emergencyEntrySchema = new Schema<IEmergencyEntry>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    altPhone: { type: String },
    email: { type: String, lowercase: true, trim: true },
    available24x7: { type: Boolean, default: true },
    serviceHours: { type: String },
  },
  { _id: false },
);

const emergencyDirectorySchema = new Schema<IEmergencyDirectory>(
  {
    district: { type: Schema.Types.ObjectId, ref: "District", required: true },
    department: { type: Schema.Types.ObjectId, ref: "Department" },

    category: { type: String, required: true, trim: true },
    entries: { type: [emergencyEntrySchema], required: true },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

emergencyDirectorySchema.index({ district: 1, isActive: 1 });

export const EmergencyDirectory = model<IEmergencyDirectory>(
  "EmergencyDirectory",
  emergencyDirectorySchema,
);

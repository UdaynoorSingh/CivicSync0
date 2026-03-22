import { Schema, model, Document } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────────
export type DepartmentCode = "ELEC" | "WATER" | "GAS" | "SANITATION" | "WASTE";

export interface IDepartment extends Document {
  name: string;
  code: DepartmentCode;
  description: string;
  icon?: string;
  /** Complaint categories that belong to this department (e.g. 'power_outage', 'streetlight') */
  serviceCategories: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const departmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      enum: ["ELEC", "WATER", "GAS", "SANITATION", "WASTE"],
    },
    description: { type: String, required: true },
    icon: { type: String },
    serviceCategories: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Department = model<IDepartment>("Department", departmentSchema);

import { Schema, model, Document } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface IDistrict extends Document {
  name: string;
  state: string;
  stateCode: string; // e.g. 'PB', 'HR', 'DL'
  pinCodes: string[];
  /** Central coordinates used for map rendering and heatmap clustering */
  coordinates: {
    latitude: number;
    longitude: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const districtSchema = new Schema<IDistrict>(
  {
    name: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    stateCode: { type: String, required: true, uppercase: true, trim: true },
    pinCodes: { type: [String], default: [] },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Compound index: one district name per state
districtSchema.index({ name: 1, state: 1 }, { unique: true });

export const District = model<IDistrict>("District", districtSchema);

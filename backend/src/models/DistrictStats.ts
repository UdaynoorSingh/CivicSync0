import { Schema, model, Document, Types } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface IDistrictMetrics {
  totalComplaints: number;
  resolvedComplaints: number;
  avgResolutionHours: number; // average hours from 'submitted' → 'resolved'

  totalServiceRequests: number;
  completedServiceRequests: number;

  avgFeedbackRating: number; // 1–5, from Feedback.overallRating
  feedbackCount: number;
}

/**
 * LEADERBOARD FORMULA (feature 12 suggestion):
 *
 * All inputs are normalised to 0–100 before weighting.
 *
 *  ResolutionRate    = (resolvedComplaints / totalComplaints) × 100
 *  SpeedScore        = max(0, 100 – (avgResolutionHours / 720) × 100)
 *                      → Full score (100) if resolved within 1 hour
 *                      → Zero score if avg > 30 days (720 hours)
 *  SatisfactionScore = (avgFeedbackRating / 5) × 100
 *  CompletionRate    = (completedServiceRequests / totalServiceRequests) × 100
 *
 *  PerformanceScore =
 *      (0.35 × ResolutionRate)
 *    + (0.25 × SpeedScore)
 *    + (0.25 × SatisfactionScore)
 *    + (0.15 × CompletionRate)
 *
 * Score range: 0–100 (higher = better district performance).
 * Recommended: recompute nightly via a scheduled cron job and cache here.
 * The `rank` field is set after sorting all districts by performanceScore DESC.
 *
 * OFFLINE HANDLING NOTE (feature 16 suggestion):
 * We recommend a client-side priority queue stored in IndexedDB (e.g. via Dexie.js).
 * Priority order on retry: Payment > ServiceRequest > Complaint > Feedback.
 * Each queued item carries a `queuedAt` timestamp and is replayed in order
 * when the network connection is restored. No additional MongoDB collection
 * is needed — the existing models handle idempotency via the unique
 * `referenceNumber` / `razorpayOrderId` fields.
 */
export interface IDistrictStats extends Document {
  district: Types.ObjectId; // ref: 'District'
  period: {
    month: number; // 1–12
    year: number;
  };
  metrics: IDistrictMetrics;
  performanceScore: number; // 0–100, computed from formula above
  rank?: number; // national rank for this period (set after sort)
  previousRank?: number; // for showing rank change (↑ ↓ —) on leaderboard
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const metricsSchema = new Schema<IDistrictMetrics>(
  {
    totalComplaints: { type: Number, default: 0 },
    resolvedComplaints: { type: Number, default: 0 },
    avgResolutionHours: { type: Number, default: 0 },

    totalServiceRequests: { type: Number, default: 0 },
    completedServiceRequests: { type: Number, default: 0 },

    avgFeedbackRating: { type: Number, default: 0 },
    feedbackCount: { type: Number, default: 0 },
  },
  { _id: false },
);

const districtStatsSchema = new Schema<IDistrictStats>(
  {
    district: { type: Schema.Types.ObjectId, ref: "District", required: true },
    period: {
      month: { type: Number, required: true, min: 1, max: 12 },
      year: { type: Number, required: true },
    },
    metrics: { type: metricsSchema, default: () => ({}) },
    performanceScore: { type: Number, default: 0, min: 0, max: 100 },
    rank: { type: Number },
    previousRank: { type: Number },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

// One stats document per district per month
districtStatsSchema.index(
  { district: 1, "period.year": 1, "period.month": 1 },
  { unique: true },
);
// For leaderboard queries: sort all districts for a given period
districtStatsSchema.index({
  "period.year": 1,
  "period.month": 1,
  performanceScore: -1,
});

export const DistrictStats = model<IDistrictStats>(
  "DistrictStats",
  districtStatsSchema,
);

import { Schema, model, Document, Types } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────────
export type FeedbackTrigger =
  | "bill_payment" // shown after successful Razorpay payment
  | "grievance_resolved" // shown when complaint status → 'resolved'
  | "service_request_completed"; // shown when service request → 'completed'

export type FeedbackCategoryLabel =
  | "speed" // how fast the issue was handled
  | "staff_behavior" // admin/staff interaction quality
  | "resolution_quality" // quality of the final resolution
  | "kiosk_experience"; // overall kiosk UI/UX experience

export interface ICategoryRating {
  label: FeedbackCategoryLabel;
  rating: number; // 1–5
}

/**
 * Feature 20: Feedback is triggered automatically after:
 *  - Successful bill payment (trigger: 'bill_payment')
 *  - Grievance settlement  (trigger: 'grievance_resolved')
 *  - Service request completion (trigger: 'service_request_completed')
 *
 * `overallRating` feeds directly into DistrictStats.metrics.avgFeedbackRating
 * for the leaderboard calculation.
 */
export interface IFeedback extends Document {
  userId: Types.ObjectId; // ref: 'User'

  trigger: FeedbackTrigger;
  referenceId: Types.ObjectId; // ID of the Payment | Complaint | ServiceRequest
  referenceModel: "Payment" | "Complaint" | "ServiceRequest";

  overallRating: number; // 1–5
  categoryRatings: ICategoryRating[];
  comment?: string;

  language: "en" | "hi" | "pa"; // language the user was using at submission time

  district: Types.ObjectId; // ref: 'District' — for leaderboard aggregation
  department: Types.ObjectId; // ref: 'Department' — for admin-level insights

  createdAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const categoryRatingSchema = new Schema<ICategoryRating>(
  {
    label: {
      type: String,
      enum: [
        "speed",
        "staff_behavior",
        "resolution_quality",
        "kiosk_experience",
      ],
      required: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
  },
  { _id: false },
);

const feedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    trigger: {
      type: String,
      enum: ["bill_payment", "grievance_resolved", "service_request_completed"],
      required: true,
    },
    referenceId: { type: Schema.Types.ObjectId, required: true },
    referenceModel: {
      type: String,
      enum: ["Payment", "Complaint", "ServiceRequest"],
      required: true,
    },

    overallRating: { type: Number, min: 1, max: 5, required: true },
    categoryRatings: { type: [categoryRatingSchema], default: [] },
    comment: { type: String, trim: true, maxlength: 500 },

    language: { type: String, enum: ["en", "hi", "pa"], default: "en" },

    district: { type: Schema.Types.ObjectId, ref: "District", required: true },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

feedbackSchema.index({ district: 1, createdAt: -1 });
feedbackSchema.index({ referenceId: 1, referenceModel: 1 }, { unique: true }); // one feedback per event

export const Feedback = model<IFeedback>("Feedback", feedbackSchema);

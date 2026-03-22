import { Schema, model, Document, Types } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────────
export type PaymentFor = "bill" | "service_request";
export type PaymentMethod = "upi" | "card" | "netbanking";
export type PaymentStatus = "initiated" | "success" | "failed" | "refunded";

/**
 * Every payment passes through Razorpay.
 * Flow: create order (razorpayOrderId) → user pays → webhook confirms
 *       (razorpayPaymentId + razorpaySignature) → status updated to 'success'
 *
 * A receipt is auto-generated on success (feature 15) and stored via Cloudinary.
 * Receipt number format: RCP-YYYYMMDD-<6-digit-random>
 */
export interface IPayment extends Document {
  userId: Types.ObjectId; // ref: 'User'

  paymentFor: PaymentFor;
  billId?: Types.ObjectId; // ref: 'Bill'        — set when paymentFor = 'bill'
  serviceRequestId?: Types.ObjectId; // ref: 'ServiceRequest' — set when paymentFor = 'service_request'

  // Razorpay fields
  razorpayOrderId: string;
  razorpayPaymentId?: string; // populated after payment gateway callback
  razorpaySignature?: string; // for server-side signature verification

  amount: number; // in INR (paise stored as integer: amount * 100 sent to Razorpay)
  currency: string; // always 'INR'
  method?: PaymentMethod;

  status: PaymentStatus;

  // Receipt (feature 15)
  receiptNumber: string; // unique — RCP-YYYYMMDD-XXXXXX
  receiptUrl?: string; // Cloudinary PDF/image URL

  failureReason?: string; // captured from Razorpay on failure
  paidAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const paymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    paymentFor: {
      type: String,
      enum: ["bill", "service_request"],
      required: true,
    },
    billId: { type: Schema.Types.ObjectId, ref: "Bill" },
    serviceRequestId: { type: Schema.Types.ObjectId, ref: "ServiceRequest" },

    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, sparse: true },
    razorpaySignature: { type: String },

    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    method: { type: String, enum: ["upi", "card", "netbanking"] },

    status: {
      type: String,
      enum: ["initiated", "success", "failed", "refunded"],
      default: "initiated",
    },

    receiptNumber: { type: String, required: true, unique: true },
    receiptUrl: { type: String },

    failureReason: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ receiptNumber: 1 });

export const Payment = model<IPayment>("Payment", paymentSchema);

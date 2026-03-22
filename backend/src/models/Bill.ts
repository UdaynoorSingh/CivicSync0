import { Schema, model, Document, Types } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────────
export type BillStatus = "pending" | "paid" | "overdue";

export interface IBill extends Document {
  userId: Types.ObjectId; // ref: 'User'
  department: Types.ObjectId; // ref: 'Department' (electricity | water | gas | waste)
  district: Types.ObjectId; // ref: 'District'

  connectionNumber: string; // matches user's utilityConnection.connectionNumber
  billNumber: string; // unique identifier, e.g. 'PSPCL-JAN26-4521'

  billingPeriod: {
    from: Date;
    to: Date;
    label: string; // e.g. 'Jan 2026'
  };

  previousBalance: number; // carried over from last cycle
  currentCharges: number;
  taxes: number;
  amount: number; // total = previousBalance + currentCharges + taxes

  units?: number; // kWh for electricity, KL for water

  dueDate: Date;
  status: BillStatus;

  paidAt?: Date;
  paymentId?: Types.ObjectId; // ref: 'Payment', set after successful payment
  gatewayPaymentId?: string; // Razorpay payment id (e.g. pay_xxxxx)

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const billSchema = new Schema<IBill>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    district: { type: Schema.Types.ObjectId, ref: "District", required: true },

    connectionNumber: { type: String, required: true, trim: true },
    billNumber: { type: String, required: true, unique: true, trim: true },

    billingPeriod: {
      from: { type: Date, required: true },
      to: { type: Date, required: true },
      label: { type: String, required: true },
    },

    previousBalance: { type: Number, required: true, default: 0 },
    currentCharges: { type: Number, required: true },
    taxes: { type: Number, required: true, default: 0 },
    amount: { type: Number, required: true },

    units: { type: Number },

    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      default: "pending",
    },

    paidAt: { type: Date },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    gatewayPaymentId: { type: String, trim: true },
  },
  { timestamps: true },
);

billSchema.index({ userId: 1, status: 1 });
billSchema.index({ userId: 1, department: 1 });

export const Bill = model<IBill>("Bill", billSchema);

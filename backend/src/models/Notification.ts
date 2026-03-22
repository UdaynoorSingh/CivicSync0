import { Schema, model, Document, Types } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────────
export type NotificationType =
  | "outage"
  | "announcement"
  | "emergency"
  | "service_update"
  | "maintenance"
  | "reminder";

export type NotificationPriority = "low" | "normal" | "high" | "critical";

/**
 * TARGET SCOPING STRATEGY (feature 13 suggestion):
 *
 * Each notification stores `district` + optional `department` refs.
 * The backend resolves target users at query time (no fan-out write pattern).
 *
 * For real-time delivery we recommend Socket.IO room-based approach:
 *   - When a citizen authenticates, they join socket room: `district:<districtId>`
 *   - When an admin broadcasts, the server emits to that room only
 *   - This avoids iterating over all online users and scales horizontally
 *     (multiple Socket.IO instances can share rooms via the Redis adapter)
 *
 * For offline citizens:
 *   - Notifications are stored in this collection
 *   - On next login the client fetches unread notifications filtered by districtId
 *   - `readBy` is a sparse array — for kiosk scale (thousands, not millions)
 *     this is acceptable; for larger scale, switch to a separate UserNotification
 *     junction collection with a compound index: { userId, notificationId }
 */
export interface IReadRecord {
  userId: Types.ObjectId;
  readAt: Date;
}

export interface INotification extends Document {
  sentBy: Types.ObjectId; // ref: 'Admin'

  title: string;
  body: string;
  type: NotificationType;
  priority: NotificationPriority;

  // Targeting — null district = broadcast to ALL districts (superadmin only)
  district?: Types.ObjectId; // ref: 'District'
  department?: Types.ObjectId; // ref: 'Department' — further narrows to dept users

  readBy: IReadRecord[];
  deletedBy: Types.ObjectId[];

  expiresAt?: Date; // notifications auto-hide after this date
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────────
const readRecordSchema = new Schema<IReadRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const notificationSchema = new Schema<INotification>(
  {
    sentBy: { type: Schema.Types.ObjectId, ref: "Admin", required: true },

    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: [
        "outage",
        "announcement",
        "emergency",
        "service_update",
        "maintenance",
        "reminder",
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
    },

    district: { type: Schema.Types.ObjectId, ref: "District" },
    department: { type: Schema.Types.ObjectId, ref: "Department" },

    readBy: { type: [readRecordSchema], default: [] },
    deletedBy: { type: [Schema.Types.ObjectId], ref: "User", default: [] },

    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

notificationSchema.index({ district: 1, isActive: 1, createdAt: -1 });
notificationSchema.index({ priority: 1, isActive: 1 });

export const Notification = model<INotification>(
  "Notification",
  notificationSchema,
);

// ── CivicSync — Mongoose Models Barrel Export ──────────────────────────────────
// Import all models from a single location:
//   import { User, Complaint, Bill } from '../models';

export { User } from "./User";
export { Admin } from "./Admin";
export { Department } from "./Department";
export { District } from "./District";
export { Bill } from "./Bill";
export { Payment } from "./Payment";
export { Complaint } from "./Complaint";
export { ServiceRequest } from "./ServiceRequest";
export { Notification } from "./Notification";
export { EmergencyDirectory } from "./EmergencyDirectory";
export { Feedback } from "./Feedback";
export { DistrictStats } from "./DistrictStats";

// ── Type re-exports ────────────────────────────────────────────────────────────
export type { IUser, IUtilityConnection, IAddress } from "./User";
export type { IAdmin, AdminRole } from "./Admin";
export type { IDepartment, DepartmentCode } from "./Department";
export type { IDistrict } from "./District";
export type { IBill, BillStatus } from "./Bill";
export type {
  IPayment,
  PaymentFor,
  PaymentMethod,
  PaymentStatus,
} from "./Payment";
export type {
  IComplaint,
  ComplaintUrgency,
  ComplaintPriority,
  ComplaintStatus,
  IStatusHistoryEntry,
} from "./Complaint";
export type {
  IServiceRequest,
  ServiceType,
  ConnectionRequestType,
  ServiceRequestStatus,
  IUploadedDocument,
  ISRStatusEntry,
} from "./ServiceRequest";
export type {
  INotification,
  NotificationType,
  NotificationPriority,
  IReadRecord,
} from "./Notification";
export type {
  IEmergencyDirectory,
  IEmergencyEntry,
} from "./EmergencyDirectory";
export type {
  IFeedback,
  FeedbackTrigger,
  FeedbackCategoryLabel,
  ICategoryRating,
} from "./Feedback";
export type { IDistrictStats, IDistrictMetrics } from "./DistrictStats";

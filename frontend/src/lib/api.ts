/**
 * Lightweight fetch wrapper for the CivicSync backend.
 * - Base URL comes from VITE_API_URL env var
 * - credentials: 'include' ensures httpOnly JWT cookies are sent automatically
 * - Returns parsed JSON; throws an Error with the server's message on non-2xx
 */

const BASE = import.meta.env.VITE_API_URL as string;

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  [key: string]: T | boolean | string | undefined;
}

async function request<T = ApiResponse>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const storedToken =
    typeof window !== "undefined"
      ? window.localStorage.getItem("authToken")
      : null;

  const baseHeaders = isFormData
    ? { ...(options.headers ?? {}) }
    : { "Content-Type": "application/json", ...(options.headers ?? {}) };

  const headers = storedToken
    ? { ...baseHeaders, Authorization: `Bearer ${storedToken}` }
    : baseHeaders;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    // Don't set Content-Type for FormData - fetch sets multipart boundary automatically
    headers,
  });

  const data = (await res.json()) as T & { message?: string };

  if (!res.ok) {
    throw new Error(data.message ?? `Request failed with status ${res.status}`);
  }

  return data;
}

// ── Auth — Citizen ─────────────────────────────────────────────────────────────

export const sendOTP = (mobile: string) =>
  request("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ mobile }),
  });

export const verifyOTP = (mobile: string, otp: string) =>
  request<{
    success: boolean;
    message: string;
    user: FullCitizenUser;
  }>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ mobile, otp }),
  });

export const getMe = () => request("/auth/me");

export const logout = () => request("/auth/logout", { method: "POST" });

export const firebaseLogin = (firebaseToken: string) =>
  request<{
    success: boolean;
    message: string;
    token: string;
    user: FullCitizenUser;
  }>("/auth/firebase-login", {
    method: "POST",
    body: JSON.stringify({ firebaseToken }),
  });

// ── Auth — Admin ───────────────────────────────────────────────────────────────

export const adminLogin = (username: string, password: string) =>
  request<{
    success: boolean;
    message: string;
    admin: {
      id: string;
      name: string;
      username: string;
      email: string;
      role: string;
      district: unknown;
      department: unknown;
    };
  }>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const adminLogout = () => request("/admin/logout", { method: "POST" });

export const adminGetMe = () =>
  request<{
    success: boolean;
    admin: {
      _id?: string;
      id?: string;
      name: string;
      username: string;
      email: string;
      role: "admin" | "superadmin";
      district?:
        | { _id?: string; id?: string; name?: string; state?: string }
        | string;
      department?:
        | { _id?: string; id?: string; name?: string; code?: string }
        | string;
    };
  }>("/admin/me");

// Head Admin
export const sendHeadAdminOTP = (mobile: string) =>
  request<{ success: boolean; message: string }>("/admin/head-admin/send-otp", {
    method: "POST",
    body: JSON.stringify({ mobile }),
  });

export const verifyHeadAdminOTP = (mobile: string, otp: string) =>
  request<{
    success: boolean;
    message: string;
    admin: {
      id: string;
      name: string;
      mobile: string;
      role: "head_admin";
    };
  }>("/admin/head-admin/verify-otp", {
    method: "POST",
    body: JSON.stringify({ mobile, otp }),
  });

export const headAdminFirebaseLogin = (firebaseToken: string) =>
  request<{
    success: boolean;
    message: string;
    token: string;
    admin: {
      id: string;
      name: string;
      mobile: string;
      role: "head_admin";
    };
  }>("/admin/head-admin/firebase-login", {
    method: "POST",
    body: JSON.stringify({ firebaseToken }),
  });

export const headAdminLogout = () =>
  request("/admin/head-admin/logout", { method: "POST" });

export const headAdminGetMe = () =>
  request<{
    success: boolean;
    admin: {
      id: string;
      name: string;
      mobile: string;
      role: "head_admin";
    };
  }>("/admin/head-admin/me");

export interface HeadAdminDepartment {
  _id: string;
  name: string;
  code: string;
}

export interface HeadAdminDepartmentAdmin {
  _id: string;
  name: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  department: { _id: string; name: string; code: string };
  district: { _id: string; name: string; state: string };
}

export interface HeadAdminFeedback {
  _id: string;
  trigger: string;
  overallRating: number;
  categoryRatings: { label: string; rating: number }[];
  comment?: string;
  language: string;
  createdAt: string;
  userId?: { _id: string; name: string; mobile: string };
  department?: { _id: string; name: string; code: string };
  district?: { _id: string; name: string; state: string };
}

export const getHeadAdminMeta = () =>
  request<{
    success: boolean;
    departments: HeadAdminDepartment[];
    districts: { id: string; name: string; state: string }[];
  }>("/admin/head-admin/meta");

export const getDepartmentAdmins = () =>
  request<{ success: boolean; admins: HeadAdminDepartmentAdmin[] }>(
    "/admin/head-admin/department-admins",
  );

export const createDepartmentAdmin = (payload: {
  departmentId: string;
  stateName: string;
  username: string;
  password: string;
  name?: string;
}) =>
  request<{
    success: boolean;
    message: string;
    admin: HeadAdminDepartmentAdmin;
  }>("/admin/head-admin/department-admins", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const removeDepartmentAdmin = (adminId: string) =>
  request<{ success: boolean; message: string }>(
    `/admin/head-admin/department-admins/${adminId}`,
    { method: "DELETE" },
  );

export const getHeadAdminFeedbacks = (page = 1) =>
  request<{
    success: boolean;
    feedbacks: HeadAdminFeedback[];
    pagination: { total: number; pages: number; page: number };
  }>(`/admin/head-admin/feedbacks?page=${page}`);

// ── Complaints ─────────────────────────────────────────────────────────────────

export interface ComplaintPayload {
  departmentCode: string; // e.g. "WATER"
  category: string;
  description: string;
  urgency: "low" | "medium" | "high";
  streetAddress?: string;
  city: string;
  state: string;
  pincode?: string;
  districtName: string;
  photo?: File | null;
}

export interface SubmittedComplaint {
  id: string;
  referenceNumber: string;
  status: string;
  department: string;
  category: string;
  urgency: string;
  city: string;
  createdAt: string;
}

export const submitComplaint = (payload: ComplaintPayload) => {
  const fd = new FormData();
  fd.append("departmentCode", payload.departmentCode);
  fd.append("category", payload.category);
  fd.append("description", payload.description);
  fd.append("urgency", payload.urgency);
  fd.append("city", payload.city);
  fd.append("state", payload.state);
  fd.append("districtName", payload.districtName);
  if (payload.streetAddress) fd.append("streetAddress", payload.streetAddress);
  if (payload.pincode) fd.append("pincode", payload.pincode);
  if (payload.photo) fd.append("photo", payload.photo);

  return request<{
    success: boolean;
    message: string;
    complaint: SubmittedComplaint;
  }>("/complaints", { method: "POST", body: fd });
};

export const getMyComplaints = () =>
  request<{ success: boolean; complaints: unknown[] }>("/complaints/my");

export const getDistrictComplaints = (districtName: string) =>
  request<{ success: boolean; descriptions: string[] }>(
    `/complaints/district/${encodeURIComponent(districtName)}`,
  );

export const getComplaintByRef = (refNumber: string) =>
  request<{ success: boolean; complaint: unknown }>(`/complaints/${refNumber}`);

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminComplaint {
  _id: string;
  referenceNumber: string;
  category: string;
  description: string;
  status: string;
  urgency: string;
  priority: string;
  createdAt: string;
  resolvedAt?: string;
  userId: { name: string; mobile: string };
  department: { name: string; code: string };
  district: { name: string; state: string };
  address: { street: string; city: string; state: string; pincode: string };
  statusHistory: { status: string; note: string; timestamp: string }[];
}

export interface AdminServiceRequest {
  _id: string;
  referenceNumber: string;
  applicantName: string;
  contactPhone: string;
  serviceType: string;
  requestType: string;
  status: string;
  createdAt: string;
  estimatedCompletionDate?: string;
  address: { street: string; city: string; state: string; pincode: string };
  department: { name: string; code: string };
}

export interface AdminStats {
  totalComplaints: number;
  submitted: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  totalSR: number;
  pendingBills?: number;
}

export const getAdminStats = () =>
  request<{ success: boolean; stats: AdminStats }>("/admin/stats");

export const getAdminComplaints = (params?: {
  status?: string;
  urgency?: string;
  priority?: string;
  search?: string;
  page?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.urgency) qs.set("urgency", params.urgency);
  if (params?.priority) qs.set("priority", params.priority);
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  return request<{
    success: boolean;
    complaints: AdminComplaint[];
    pagination: { total: number; pages: number; page: number };
  }>(`/admin/complaints?${qs}`);
};

export const updateComplaintStatus = (
  id: string,
  status: string,
  note?: string,
) =>
  request(`/admin/complaints/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  });

export const escalateComplaintPriority = (id: string, priority: string) =>
  request(`/admin/complaints/${id}/priority`, {
    method: "PATCH",
    body: JSON.stringify({ priority }),
  });

export const getAdminServiceRequests = (params?: {
  status?: string;
  search?: string;
  page?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  return request<{
    success: boolean;
    serviceRequests: AdminServiceRequest[];
    pagination: { total: number; pages: number; page: number };
  }>(`/admin/service-requests?${qs}`);
};

export const updateServiceRequestStatus = (
  id: string,
  status: string,
  note?: string,
) =>
  request(`/admin/service-requests/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  });

// ── Service Requests (Citizen) ────────────────────────────────────────────────

export interface CitizenServiceRequest {
  _id: string;
  referenceNumber: string;
  serviceType: string;
  requestType: string;
  applicantName: string;
  contactPhone: string;
  status: string;
  createdAt: string;
  estimatedCompletionDate?: string;
  completedAt?: string;
  department: { name: string; code: string };
  district: { name: string; state: string };
  address: { street: string; city: string; state: string; pincode: string };
  statusHistory: { status: string; note: string; timestamp: string }[];
}

export interface ServiceRequestPayload {
  serviceType: string;
  requestType: string;
  applicantName: string;
  contactPhone: string;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  districtName: string;
  additionalNotes?: string;
  idProof?: File | null;
  addressProof?: File | null;
}

export const submitServiceRequest = (payload: ServiceRequestPayload) => {
  const fd = new FormData();
  fd.append("serviceType", payload.serviceType);
  fd.append("requestType", payload.requestType);
  fd.append("applicantName", payload.applicantName);
  fd.append("contactPhone", payload.contactPhone);
  fd.append("streetAddress", payload.streetAddress);
  fd.append("city", payload.city);
  fd.append("state", payload.state);
  fd.append("pincode", payload.pincode);
  fd.append("districtName", payload.districtName);
  if (payload.additionalNotes)
    fd.append("additionalNotes", payload.additionalNotes);
  if (payload.idProof) fd.append("id_proof", payload.idProof);
  if (payload.addressProof) fd.append("address_proof", payload.addressProof);

  return request<{
    success: boolean;
    message: string;
    serviceRequest: {
      id: string;
      referenceNumber: string;
      status: string;
      serviceType: string;
      requestType: string;
      department: string;
      district: string;
      createdAt: string;
    };
  }>("/service-requests", { method: "POST", body: fd });
};

export const getMyServiceRequests = () =>
  request<{ success: boolean; serviceRequests: CitizenServiceRequest[] }>(
    "/service-requests/my",
  );

export const getServiceRequestById = (id: string) =>
  request<{ success: boolean; serviceRequest: CitizenServiceRequest }>(
    `/service-requests/${id}`,
  );

// ── Heatmap ────────────────────────────────────────────────────────────────────

// Help & Support
export interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  email: string;
  icon: "shield" | "help-circle";
  color: string;
}

export interface ImportantContact {
  id: string;
  name: string;
  number: string;
  email: string;
}

export const getHelpContacts = () =>
  request<{
    success: boolean;
    emergencyContacts: EmergencyContact[];
    importantContacts: ImportantContact[];
  }>("/help/contacts");

export interface HeatmapDistrict {
  districtId: string;
  name: string;
  count: number;
  topCategory: string;
  urgencyScore: number;
  lat: number;
  lng: number;
}

export const getHeatmap = (params?: {
  districtId?: string;
  days?: number;
  category?: string;
}) => {
  const qs = new URLSearchParams();
  if (params?.districtId) qs.set("districtId", params.districtId);
  if (params?.days) qs.set("days", String(params.days));
  if (params?.category) qs.set("category", params.category);
  return request<{ success: boolean; districts: HeatmapDistrict[] }>(
    `/complaints/heatmap${qs.toString() ? `?${qs}` : ""}`,
  );
};

// Payments (Citizen)
export type PaymentFor = "bill" | "service_request";
export type PaymentMethod = "upi" | "card" | "netbanking";
export type PaymentStatus = "initiated" | "success" | "failed" | "refunded";

export interface PaymentSummary {
  id: string;
  paymentFor: PaymentFor;
  amount: number;
  status: PaymentStatus;
  method?: PaymentMethod;
  receiptNumber: string;
  receiptUrl?: string;
  paidAt?: string;
}

export interface CreatePaymentOrderResponse {
  success: boolean;
  message: string;
  keyId: string;
  order: {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
  };
  payment: {
    id: string;
    paymentFor: PaymentFor;
    amount: number;
    status: PaymentStatus;
    receiptNumber: string;
  };
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  payment: PaymentSummary;
}

export interface CitizenPayment {
  _id: string;
  paymentFor: PaymentFor;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method?: PaymentMethod;
  receiptNumber: string;
  receiptUrl?: string;
  paidAt?: string;
  createdAt: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
}

export const getRazorpayKey = () =>
  request<{ success: boolean; keyId: string }>("/payments/key");

export const createPaymentOrder = (payload: {
  paymentFor: PaymentFor;
  billId?: string;
  serviceRequestId?: string;
}) =>
  request<CreatePaymentOrderResponse>("/payments/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const verifyPayment = (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) =>
  request<VerifyPaymentResponse>("/payments/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const markPaymentFailure = (payload: {
  razorpay_order_id: string;
  reason?: string;
}) =>
  request<{ success: boolean; message: string }>("/payments/failure", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getMyPayments = () =>
  request<{ success: boolean; payments: CitizenPayment[] }>("/payments/my");

export const getPaymentById = (id: string) =>
  request<{ success: boolean; payment: CitizenPayment }>(`/payments/${id}`);

export const downloadPaymentReceipt = async (
  paymentId: string,
): Promise<void> => {
  const storedToken =
    typeof window !== "undefined"
      ? window.localStorage.getItem("authToken")
      : null;

  const headers: HeadersInit = storedToken
    ? { Authorization: `Bearer ${storedToken}` }
    : {};

  const res = await fetch(`${BASE}/payments/${paymentId}/receipt`, {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    let message = `Failed to download receipt (${res.status})`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) message = data.message;
    } catch {
      // Keep fallback message
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const fileName = match?.[1] ?? `receipt-${paymentId}.pdf`;

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

// Bills (Citizen)
export type BillStatus = "pending" | "paid" | "overdue";

export interface CitizenBill {
  _id: string;
  connectionNumber: string;
  billNumber: string;
  billingPeriod: {
    from: string;
    to: string;
    label: string;
  };
  previousBalance: number;
  currentCharges: number;
  taxes: number;
  amount: number;
  units?: number;
  dueDate: string;
  status: BillStatus;
  paidAt?: string;
  paymentId?: string;
  department?: { name: string; code: string };
  district?: { name: string; state: string };
  createdAt: string;
}

export const getMyBills = (status?: BillStatus) =>
  request<{ success: boolean; bills: CitizenBill[] }>(
    `/bills/my${status ? `?status=${status}` : ""}`,
  );

export const getBillById = (id: string) =>
  request<{ success: boolean; bill: CitizenBill }>(`/bills/${id}`);

// Admin Bills
export interface AdminBillUser {
  _id: string;
  name: string;
  mobile: string;
}

export interface AdminBillDepartment {
  _id: string;
  name: string;
  code: string;
}

export interface AdminBill {
  _id: string;
  billNumber: string;
  connectionNumber: string;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue";
  billingPeriod: { from: string; to: string; label: string };
  userId: { _id: string; name: string; mobile: string };
  department: { _id: string; name: string; code: string };
  district?: { _id: string; name: string; state: string };
  createdAt: string;
}

export const getAdminBillMeta = () =>
  request<{
    success: boolean;
    users: AdminBillUser[];
    departments: AdminBillDepartment[];
  }>("/admin/bills/meta");

export const getAdminBills = (params?: {
  status?: "pending" | "paid" | "overdue" | "all";
  userId?: string;
  departmentId?: string;
  search?: string;
  page?: number;
}) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.userId) qs.set("userId", params.userId);
  if (params?.departmentId) qs.set("departmentId", params.departmentId);
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));

  return request<{
    success: boolean;
    bills: AdminBill[];
    pagination: { total: number; pages: number; page: number };
  }>(`/admin/bills?${qs}`);
};

export const createAdminBill = (payload: {
  userId: string;
  departmentId: string;
  amount: number;
  dueDate?: string;
}) =>
  request<{ success: boolean; message: string; bill: AdminBill }>(
    "/admin/bills",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

// ── Profile (Citizen) ─────────────────────────────────────────────────────────────────

export interface DistrictOption {
  id: string;
  name: string;
  state: string;
}

export interface UserAddress {
  houseNo?: string;
  street?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  preferredLanguage?: string;
  districtId?: string;
  address?: UserAddress;
}

export interface FullCitizenUser {
  id: string;
  name: string;
  mobile: string;
  preferredLanguage: string;
  district?: { _id: string; name: string; state: string } | string;
  address?: UserAddress;
  createdAt?: string;
}

export const getDistricts = () =>
  request<{ success: boolean; districts: DistrictOption[] }>("/auth/districts");

export const updateProfile = (payload: UpdateProfilePayload) =>
  request<{ success: boolean; message: string; user: FullCitizenUser }>(
    "/auth/profile",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

export const getFullProfile = () =>
  request<{ success: boolean; user: FullCitizenUser }>("/auth/me");

// ── Notifications ─────────────────────────────────────────────────────────────

export interface ApiNotification {
  _id: string;
  sentBy: string;
  title: string;
  body: string;
  type: string;
  priority: string;
  district?: string;
  department?: string;
  readBy: { userId: string; readAt: string }[];
  deletedBy: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const getNotifications = () =>
  request<{ success: boolean; notifications: ApiNotification[] }>(
    "/notifications",
  );

export const getAdminNotifications = () =>
  request<{ success: boolean; notifications: ApiNotification[] }>(
    "/notifications/admin",
  );

export const pushNotification = (payload: {
  title: string;
  body: string;
  type: string;
  priority?: string;
}) =>
  request<{
    success: boolean;
    message?: string;
    notification: ApiNotification;
  }>("/notifications/push", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const markNotificationAsRead = (id: string) =>
  request<{ success: boolean; message: string }>(
    `/notifications/${id}/read`,
    { method: "PUT" },
  );

export const markAllNotificationsAsRead = () =>
  request<{ success: boolean; message: string }>(
    "/notifications/read-all",
    { method: "PUT" },
  );

export const deleteNotification = (id: string) =>
  request<{ success: boolean; message: string }>(`/notifications/${id}`, {
    method: "DELETE",
  });

export const deleteAllNotifications = () =>
  request<{ success: boolean; message: string }>("/notifications/delete-all", {
    method: "DELETE",
  });

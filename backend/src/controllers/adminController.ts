/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from "express";
import { isValidObjectId } from "mongoose";
import { Complaint } from "../models/Complaint";
import { ServiceRequest } from "../models/ServiceRequest";
import { Bill } from "../models/Bill";
import { User } from "../models/User";
import { Department } from "../models/Department";
import type { ComplaintStatus, ComplaintPriority } from "../models/Complaint";
import type { ServiceRequestStatus } from "../models/ServiceRequest";

const PAGE_SIZE = 20;

function getPage(req: Request) {
  return Math.max(1, parseInt((req.query.page as string) ?? "1", 10));
}

const isSuperAdmin = (req: Request): boolean => req.user?.role === "superadmin";

const getAdminScope = (req: Request): { districtId?: string; departmentId?: string } => {
  const districtId = req.user?.districtId;
  const departmentId = req.user?.departmentId;

  if (isSuperAdmin(req)) {
    return {
      districtId: districtId || undefined,
      departmentId: undefined,
    };
  }

  return {
    districtId: districtId || undefined,
    departmentId: departmentId || undefined,
  };
};

const monthLabel = (date: Date): string =>
  date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

const generateBillNumber = async (
  deptCode: string,
  connectionNumber: string,
): Promise<string> => {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const connSuffix = connectionNumber.replace(/[^A-Za-z0-9]/g, "").slice(-6).toUpperCase() || "000000";

  for (let i = 0; i < 10; i += 1) {
    const rand = Math.floor(100 + Math.random() * 900);
    const billNumber = `${deptCode}-${yyyymm}-${connSuffix}-${rand}`;
    const exists = await Bill.exists({ billNumber });
    if (!exists) return billNumber;
  }

  throw new Error("Unable to generate unique bill number.");
};

export const getAdminComplaints = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, urgency, priority, search } = req.query as Record<string, string>;
    const { districtId, departmentId } = getAdminScope(req);
    const page = getPage(req);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (districtId) filter.district = districtId;
    if (departmentId) filter.department = departmentId;
    if (status && status !== "all") filter.status = status;
    if (urgency && urgency !== "all") filter.urgency = urgency;
    if (priority && priority !== "all") filter.priority = priority;
    if (search) {
      filter.$or = [
        { referenceNumber: new RegExp(search, "i") },
        { category: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .populate("userId", "name mobile")
        .populate("department", "name code")
        .populate("district", "name state")
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      complaints,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        pages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { districtId, departmentId } = getAdminScope(req);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseFilter: Record<string, any> = {};
    if (districtId) baseFilter.district = districtId;
    if (departmentId) baseFilter.department = departmentId;

    const [totalComplaints, submitted, inProgress, resolved, rejected, totalSR] =
      await Promise.all([
        Complaint.countDocuments(baseFilter),
        Complaint.countDocuments({ ...baseFilter, status: "submitted" }),
        Complaint.countDocuments({
          ...baseFilter,
          status: { $in: ["acknowledged", "in_progress"] },
        }),
        Complaint.countDocuments({ ...baseFilter, status: "resolved" }),
        Complaint.countDocuments({ ...baseFilter, status: "rejected" }),
        ServiceRequest.countDocuments(baseFilter),
      ]);

    const billScope: Record<string, string> = {};
    if (districtId) billScope.district = districtId;
    if (departmentId) billScope.department = departmentId;

    const pendingBills = await Bill.countDocuments({
      ...billScope,
      status: { $in: ["pending", "overdue"] },
    });

    res.status(200).json({
      success: true,
      stats: {
        totalComplaints,
        submitted,
        inProgress,
        resolved,
        rejected,
        totalSR,
        pendingBills,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateComplaintStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, note } = req.body as {
      status?: ComplaintStatus;
      note?: string;
    };

    const validStatuses: ComplaintStatus[] = [
      "submitted",
      "acknowledged",
      "in_progress",
      "escalated",
      "resolved",
      "rejected",
    ];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: "Invalid status value." });
      return;
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      res.status(404).json({ success: false, message: "Complaint not found." });
      return;
    }

    complaint.status = status;
    if (status === "resolved") complaint.resolvedAt = new Date();

    complaint.statusHistory.push({
      status,
      updatedBy: req.user!.id as unknown as import("mongoose").Types.ObjectId,
      updatedByModel: "Admin",
      note: note ?? "",
      timestamp: new Date(),
    });

    await complaint.save();

    res.status(200).json({
      success: true,
      message: `Complaint status updated to '${status}'.`,
      complaint: { id: complaint._id, status: complaint.status },
    });
  } catch (err) {
    next(err);
  }
};

export const escalateComplaintPriority = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { priority } = req.body as { priority?: ComplaintPriority };

    const validPriorities: ComplaintPriority[] = ["low", "medium", "high", "critical"];
    if (!priority || !validPriorities.includes(priority)) {
      res.status(400).json({ success: false, message: "Invalid priority value." });
      return;
    }

    const complaint = await Complaint.findByIdAndUpdate(
      id,
      { priority },
      { new: true, runValidators: true },
    ).lean();

    if (!complaint) {
      res.status(404).json({ success: false, message: "Complaint not found." });
      return;
    }

    res.status(200).json({ success: true, message: "Priority updated.", complaint });
  } catch (err) {
    next(err);
  }
};

export const getAdminServiceRequests = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, search } = req.query as Record<string, string>;
    const { districtId } = getAdminScope(req);
    const page = getPage(req);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (districtId) filter.district = districtId;
    if (status && status !== "all") filter.status = status;
    if (search) {
      filter.$or = [
        { referenceNumber: new RegExp(search, "i") },
        { applicantName: new RegExp(search, "i") },
        { serviceType: new RegExp(search, "i") },
      ];
    }

    const [serviceRequests, total] = await Promise.all([
      ServiceRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .populate("userId", "name mobile")
        .populate("department", "name code")
        .lean(),
      ServiceRequest.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      serviceRequests,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        pages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateServiceRequestStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, note, estimatedCompletionDate } = req.body as {
      status?: ServiceRequestStatus;
      note?: string;
      estimatedCompletionDate?: string;
    };

    const validStatuses: ServiceRequestStatus[] = [
      "submitted",
      "under_review",
      "approved",
      "rejected",
      "processing",
      "completed",
    ];

    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: "Invalid status value." });
      return;
    }

    const sr = await ServiceRequest.findById(id);
    if (!sr) {
      res.status(404).json({ success: false, message: "Service request not found." });
      return;
    }

    sr.status = status;
    if (status === "completed") sr.completedAt = new Date();
    if (estimatedCompletionDate) sr.estimatedCompletionDate = new Date(estimatedCompletionDate);

    sr.statusHistory.push({
      status,
      updatedBy: req.user!.id as unknown as import("mongoose").Types.ObjectId,
      note: note ?? "",
      timestamp: new Date(),
    });

    await sr.save();

    res.status(200).json({
      success: true,
      message: `Service request status updated to '${status}'.`,
      serviceRequest: { id: sr._id, status: sr.status },
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminBillMeta = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { districtId, departmentId } = getAdminScope(req);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userFilter: Record<string, any> = {};
    if (districtId) {
      userFilter.district = districtId;
    }
    const users = await User.find(userFilter)
      .select("name mobile district")
      .sort({ mobile: 1 })
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const departmentFilter: Record<string, any> = { isActive: true };
    if (departmentId) {
      departmentFilter._id = departmentId;
    }

    const departments = await Department.find(departmentFilter)
      .select("name code")
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      users,
      departments,
      scope: { departmentId: departmentId ?? null },
    });
  } catch (err) {
    next(err);
  }
};

export const createAdminBill = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId, departmentId: requestedDepartmentId, amount, dueDate } = req.body as {
      userId?: string;
      departmentId?: string;
      amount?: number;
      dueDate?: string;
    };

    if (!userId || amount == null) {
      res.status(400).json({
        success: false,
        message: "userId and amount are required.",
      });
      return;
    }

    const { districtId, departmentId: scopedDepartmentId } = getAdminScope(req);

    if (
      requestedDepartmentId &&
      scopedDepartmentId &&
      requestedDepartmentId !== scopedDepartmentId
    ) {
      res.status(403).json({
        success: false,
        message: "You can only create bills for your assigned department.",
      });
      return;
    }

    const effectiveDepartmentId = scopedDepartmentId ?? requestedDepartmentId;
    if (!effectiveDepartmentId) {
      res.status(400).json({
        success: false,
        message: "departmentId is required.",
      });
      return;
    }

    if (!isValidObjectId(userId) || !isValidObjectId(effectiveDepartmentId)) {
      res.status(400).json({ success: false, message: "Invalid user/department id." });
      return;
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ success: false, message: "Amount must be greater than 0." });
      return;
    }

    const user = await User.findById(userId)
      .select("district utilityConnections")
      .lean();
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    if (districtId && user.district && user.district.toString() !== districtId) {
      res.status(403).json({
        success: false,
        message: "You can only create bills for users in your district.",
      });
      return;
    }

    const dept = await Department.findById(effectiveDepartmentId)
      .select("_id code name")
      .lean();
    if (!dept) {
      res.status(404).json({ success: false, message: "Department not found." });
      return;
    }

    const billDistrict = user.district ?? districtId;
    if (!billDistrict) {
      res.status(400).json({
        success: false,
        message: "User district is missing. Update user profile with district first.",
      });
      return;
    }

    const now = new Date();
    const periodFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const normalizedDueDate = dueDate ? new Date(dueDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10);

    if (Number.isNaN(normalizedDueDate.getTime())) {
      res.status(400).json({ success: false, message: "Invalid dueDate." });
      return;
    }

    const matchedConnection = (user.utilityConnections ?? []).find(
      (c) => c.department.toString() === dept._id.toString(),
    );

    const connectionNumber =
      matchedConnection?.connectionNumber ?? `${dept.code}-${user._id.toString().slice(-6).toUpperCase()}`;

    const billNumber = await generateBillNumber(dept.code, connectionNumber);

    const currentCharges = Number(amount);
    const previousBalance = 0;
    const taxes = 0;

    const bill = await Bill.create({
      userId,
      department: dept._id,
      district: billDistrict,
      connectionNumber,
      billNumber,
      billingPeriod: {
        from: periodFrom,
        to: periodTo,
        label: monthLabel(periodFrom),
      },
      previousBalance,
      currentCharges,
      taxes,
      amount: currentCharges + previousBalance + taxes,
      dueDate: normalizedDueDate,
      status: "pending",
    });

    const populated = await Bill.findById(bill._id)
      .populate("userId", "name mobile")
      .populate("department", "name code")
      .populate("district", "name state")
      .lean();

    res.status(201).json({
      success: true,
      message: "Bill created successfully.",
      bill: populated,
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminBills = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status = "pending", userId, departmentId, search } = req.query as Record<string, string>;
    const page = getPage(req);

    const { districtId, departmentId: scopedDepartmentId } = getAdminScope(req);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (districtId) filter.district = districtId;

    if (scopedDepartmentId) {
      if (departmentId && departmentId !== scopedDepartmentId) {
        res.status(403).json({
          success: false,
          message: "You can only view bills for your assigned department.",
        });
        return;
      }
      filter.department = scopedDepartmentId;
    } else if (departmentId && isValidObjectId(departmentId)) {
      filter.department = departmentId;
    }

    if (userId) {
      if (!isValidObjectId(userId)) {
        res.status(400).json({ success: false, message: "Invalid userId." });
        return;
      }
      filter.userId = userId;
    }

    if (status === "all") {
      // no-op
    } else if (status === "pending") {
      filter.status = { $in: ["pending", "overdue"] };
    } else {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { billNumber: new RegExp(search, "i") },
        { connectionNumber: new RegExp(search, "i") },
      ];
    }

    const [bills, total] = await Promise.all([
      Bill.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .populate("userId", "name mobile")
        .populate("department", "name code")
        .populate("district", "name state")
        .lean(),
      Bill.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      bills,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        pages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (err) {
    next(err);
  }
};

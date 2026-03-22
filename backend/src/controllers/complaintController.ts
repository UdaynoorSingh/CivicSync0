/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from "express";
import { Department } from "../models/Department";
import { District } from "../models/District";
import { Complaint } from "../models/Complaint";
import { generateRefNumber } from "../utils/generateRefNumber";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload";

export const submitComplaint = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const idempotencyKey = req.headers['x-idempotency-key'] as string;

    if (idempotencyKey) {
      const existingComplaint = await Complaint.findOne({ idempotencyKey });
      if (existingComplaint) {
        res.status(200).json({
          success: true,
          message: "Complaint already processed.",
          complaint: {
            id: existingComplaint._id,
            referenceNumber: existingComplaint.referenceNumber,
            status: existingComplaint.status,
            category: existingComplaint.category,
            urgency: existingComplaint.urgency,
            createdAt: existingComplaint.createdAt,
          },
        });
        return;
      }
    }

    const {
      departmentCode,
      category,
      description,
      urgency = "medium",
      streetAddress = "",
      city = "",
      state = "",
      pincode = "000000",
      districtName = "",
    } = req.body as {
      departmentCode?: string;
      category?: string;
      description?: string;
      urgency?: string;
      streetAddress?: string;
      city?: string;
      state?: string;
      pincode?: string;
      districtName?: string;
    };

    if (!departmentCode || !category || !description) {
      res.status(400).json({
        success: false,
        message: "departmentCode, category, and description are required.",
      });
      return;
    }

    if (description.length < 10) {
      res.status(400).json({
        success: false,
        message: "Description must be at least 10 characters.",
      });
      return;
    }

    const department = await Department.findOne({
      code: departmentCode.toUpperCase(),
    });
    if (!department) {
      res.status(404).json({
        success: false,
        message: `Department '${departmentCode}' not found.`,
      });
      return;
    }

    // Auto-create the district/state record if it doesn't exist
    // IMPORTANT: The District DB collection represents States now.
    const stateName = (state || districtName || "Unknown").trim();
    let district = await District.findOne({
      name: new RegExp(`^${stateName}$`, "i"),
    });
    if (!district) {
      district = await District.create({
        name: stateName,
        state: stateName,
        stateCode: stateName.substring(0, 2).toUpperCase(),
        pinCodes: pincode && pincode !== "000000" ? [pincode] : [],
        coordinates: { latitude: 20.5937, longitude: 78.9629 },
        isActive: true,
      });
    }

    let photoUrl = "";
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (file) {
      photoUrl = await uploadBufferToCloudinary(file, "complaints");
    }

    const referenceNumber = await generateRefNumber("COMP");

    const coords = district.coordinates ?? {
      longitude: 76.9905,
      latitude: 29.6857,
    };

    const complaint = await Complaint.create({
      userId,
      department: department._id,
      district: district._id,
      referenceNumber,
      category,
      description,
      address: {
        houseNo: "-",
        street: streetAddress || "-",
        city,
        state,
        pincode,
      },
      location: {
        type: "Point",
        coordinates: [coords.longitude, coords.latitude],
      },
      photoUrl,
      urgency,
      priority: urgency,
      status: "submitted",
      idempotencyKey, 
      statusHistory: [
        {
          status: "submitted",
          updatedByModel: "User",
          note: "Complaint registered by citizen.",
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Complaint registered successfully.",
      complaint: {
        id: complaint._id,
        referenceNumber: complaint.referenceNumber,
        status: complaint.status,
        department: department.name,
        category: complaint.category,
        urgency: complaint.urgency,
        city,
        createdAt: complaint.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMyComplaints = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const complaints = await Complaint.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .populate("department", "name code icon")
      .populate("district", "name state")
      .lean();

    res.status(200).json({ success: true, complaints });
  } catch (err) {
    next(err);
  }
};

export const getComplaintByRef = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refNumber } = req.params;
    const complaint = await Complaint.findOne({ referenceNumber: refNumber })
      .populate("department", "name code")
      .populate("district", "name state")
      .lean();

    if (!complaint) {
      res.status(404).json({ success: false, message: "Complaint not found." });
      return;
    }

    if (
      req.user!.role === "citizen" &&
      complaint.userId.toString() !== req.user!.id
    ) {
      res.status(403).json({ success: false, message: "Access denied." });
      return;
    }

    res.status(200).json({ success: true, complaint });
  } catch (err) {
    next(err);
  }
};


export const getHeatmap = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      districtId,
      days = "30",
      category,
    } = req.query as Record<string, string>;

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days, 10));

    const match: Record<string, any> = { createdAt: { $gte: since } };
    if (districtId) match.district = districtId;
    if (category) match.category = new RegExp(category, "i");

    const results = await Complaint.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$district",
          count: { $sum: 1 },
          topCategory: { $first: "$category" },
          urgencySum: {
            $sum: {
              $cond: [
                { $eq: ["$urgency", "high"] },
                3,
                { $cond: [{ $eq: ["$urgency", "medium"] }, 2, 1] },
              ],
            },
          },
          lat: { $first: { $arrayElemAt: ["$location.coordinates", 1] } },
          lng: { $first: { $arrayElemAt: ["$location.coordinates", 0] } },
        },
      },
      {
        $lookup: {
          from: "districts",
          localField: "_id",
          foreignField: "_id",
          as: "districtInfo",
        },
      },
      { $unwind: { path: "$districtInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          districtId: "$_id",
          name: { $ifNull: ["$districtInfo.name", "Unknown"] },
          count: 1,
          topCategory: 1,
          urgencyScore: "$urgencySum",
          lat: 1,
          lng: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({ success: true, districts: results });
  } catch (err) {
    next(err);
  }
};


export const getDistrictComplaints = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { districtName } = req.params;

    const district = await District.findOne({
      name: new RegExp(`^${districtName}$`, "i"),
    });

    if (!district) {
      res.status(404).json({ success: false, message: "District not found." });
      return;
    }

    const complaints = await Complaint.find({ district: district._id })
      .select("description")
      .lean();

    const descriptions = complaints.map((c) => c.description);

    res.status(200).json({ success: true, descriptions });
  } catch (err) {
    next(err);
  }
};
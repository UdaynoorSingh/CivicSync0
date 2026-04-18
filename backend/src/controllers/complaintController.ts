/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from "express";
import { Department } from "../models/Department";
import { District } from "../models/District";
import { Complaint } from "../models/Complaint";
import { generateRefNumber } from "../utils/generateRefNumber";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload";
import { getStateCoords } from "../utils/stateCoordinates";
import { calculateSLA } from "../utils/calculateSLA";

import https from "https";
import { Admin } from "../models";

/* ─── Nominatim geocoder (uses Node built-in https — works on all Node versions) */
function geocodeAddress(
  streetAddress: string,
  city: string,
  state: string,
): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    try {
      const query = [streetAddress, city, state, "India"]
        .filter(Boolean)
        .join(", ");

      const url =
        "https://nominatim.openstreetmap.org/search?" +
        new URLSearchParams({ format: "json", limit: "1", q: query }).toString();

      const req = https.get(
        url,
        { headers: { "User-Agent": "CivicSync/1.0" } },
        (res) => {
          let body = "";
          res.on("data", (chunk: Buffer) => (body += chunk.toString()));
          res.on("end", () => {
            try {
              const data = JSON.parse(body) as { lat: string; lon: string }[];
              if (!data.length) return resolve(null);
              const lat = parseFloat(data[0].lat);
              const lng = parseFloat(data[0].lon);
              if (isNaN(lat) || isNaN(lng)) return resolve(null);
              resolve({ lat, lng });
            } catch {
              resolve(null);
            }
          });
        },
      );

      req.on("error", () => resolve(null));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

/* ─── Submit Complaint ────────────────────────────────────────────────────── */

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

    // ── Resolve state coordinates ──────────────────────────────────────────
    const stateName = (state || districtName || "Unknown").trim();
    const stateCoord = getStateCoords(stateName);
    const stateLat = stateCoord?.lat ?? 20.5937;
    const stateLng = stateCoord?.lng ?? 78.9629;

    // ── Find or create the District (state) record ─────────────────────────
    let district = await District.findOne({
      name: new RegExp(`^${stateName}$`, "i"),
    });

    if (!district) {
      // Brand-new district → use correct state centre coordinates
      district = await District.create({
        name: stateName,
        state: stateName,
        stateCode: stateName.substring(0, 2).toUpperCase(),
        pinCodes: pincode && pincode !== "000000" ? [pincode] : [],
        coordinates: { latitude: stateLat, longitude: stateLng },
        isActive: true,
      });
    } else if (
      stateCoord &&
      district.coordinates.latitude === 20.5937 &&
      district.coordinates.longitude === 78.9629
    ) {
      // Existing district still has the old generic default → fix it now
      district.coordinates = { latitude: stateLat, longitude: stateLng };
      await district.save();
    }

    // ── Geocode the full address; fall back to state centre ────────────────
    let finalLat = stateLat;
    let finalLng = stateLng;

    if (streetAddress || city) {
      const geo = await geocodeAddress(streetAddress, city, state);
      if (geo) {
        finalLat = geo.lat;
        finalLng = geo.lng;
      }
    }

    // ── Upload photo ──────────────────────────────────────────────────────
    let photoUrl = "";
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (file) {
      photoUrl = await uploadBufferToCloudinary(file, "complaints");
    }

    const referenceNumber = await generateRefNumber("COMP");

    // calculating SLA
    const slaBreachTime = calculateSLA(urgency);

    // Finding an active Tier 1 Admin for this district & department
    const tier1Admin = await Admin.findOne({
      district: district._id,
      department: department._id,
      tier: 1,
      isActive: true,
    }).sort({ lastLogin: -1 }); // Basic load balancing: assign to recently active

    // ── Create complaint with geocoded coordinates ────────────────────────
    const complaint = await Complaint.create({
      userId,
      department: department._id,
      district: district._id,
      assignedAdmin: tier1Admin ? tier1Admin._id : undefined, // add the assigned admin field
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
        coordinates: [finalLng, finalLat],
      },
      photoUrl,
      urgency,
      priority: urgency,
      status: "submitted",
      idempotencyKey,
      escalationLevel : 0,
      slaBreachTime,
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
          // Use district coordinates (accurate state centre) as the
          // authoritative source for heatmap markers. Fall back to
          // the complaint's coordinates only if the district has none.
          lat: { $ifNull: ["$districtInfo.coordinates.latitude", "$lat"] },
          lng: { $ifNull: ["$districtInfo.coordinates.longitude", "$lng"] },
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
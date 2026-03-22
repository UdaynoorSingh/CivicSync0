/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from "express";
import { ServiceRequest } from "../models/ServiceRequest";
import { Department } from "../models/Department";
import { District } from "../models/District";
import { generateRefNumber } from "../utils/generateRefNumber";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload";

const SERVICE_CODE: Record<string, string> = {
  electricity: "ELEC",
  water: "WATER",
  gas: "GAS",
  sanitation: "SANITATION",
  waste_management: "WASTE",
};

export const submitServiceRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const idempotencyKey = req.headers['x-idempotency-key'] as string;

    if (idempotencyKey) {
      const existingReq = await ServiceRequest.findOne({ idempotencyKey });
      if (existingReq) {
        res.status(200).json({
          success: true,
          message: "Service request already processed.",
          serviceRequest: {
            id: existingReq._id,
            referenceNumber: existingReq.referenceNumber,
            status: existingReq.status,
            serviceType: existingReq.serviceType,
            requestType: existingReq.requestType,
            createdAt: existingReq.createdAt,
          },
        });
        return;
      }
    }

    const {
      serviceType,
      requestType = "new_connection",
      applicantName,
      contactPhone,
      streetAddress = "-",
      city,
      state = "Haryana",
      pincode = "000000",
      districtName,
      additionalNotes,
    } = req.body as {
      serviceType?: string;
      requestType?: string;
      applicantName?: string;
      contactPhone?: string;
      streetAddress?: string;
      city?: string;
      state?: string;
      pincode?: string;
      districtName?: string;
      additionalNotes?: string;
    };

    if (
      !serviceType ||
      !applicantName ||
      !contactPhone ||
      !districtName ||
      !city
    ) {
      res.status(400).json({
        success: false,
        message:
          "serviceType, applicantName, contactPhone, city, and districtName are required.",
      });
      return;
    }

    const deptCode = SERVICE_CODE[serviceType];
    if (!deptCode) {
      res.status(400).json({
        success: false,
        message: `Unknown service type '${serviceType}'.`,
      });
      return;
    }

    const stateName = (state || districtName || "Unknown").trim();
    const [department, existingDistrict] = await Promise.all([
      Department.findOne({ code: deptCode }),
      District.findOne({ name: new RegExp(`^${stateName}$`, "i") }),
    ]);

    if (!department) {
      res.status(404).json({
        success: false,
        message: `Department for '${serviceType}' not found.`,
      });
      return;
    }

    // Auto-create the state/district record if it doesn't exist
    let district = existingDistrict;
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

    const filesDict =
      (
        req as Request & {
          files?: { [fieldname: string]: Express.Multer.File[] };
        }
      ).files ?? {};
    const uploadedFiles = Object.values(filesDict).flat() as Express.Multer.File[];

    const documents = await Promise.all(
      uploadedFiles.map(async (f) => {
        const url = await uploadBufferToCloudinary(f, "service-requests");
        return {
          type: f.fieldname as
            | "id_proof"
            | "address_proof"
            | "property_document"
            | "other",
          url,
          name: f.originalname,
        };
      }),
    );

    const referenceNumber = await generateRefNumber("SRQ", ServiceRequest);

    const sr = await ServiceRequest.create({
      userId: req.user!.id,
      department: department._id,
      district: district._id,
      referenceNumber,
      serviceType,
      requestType,
      applicantName,
      contactPhone,
      address: {
        houseNo: "-",
        street: streetAddress,
        city,
        state,
        pincode,
      },
      documents,
      additionalNotes,
      applicationFee: 0,
      status: "submitted",
      idempotencyKey, 
      statusHistory: [
        {
          status: "submitted",
          note: "Service request submitted by citizen.",
          timestamp: new Date(),
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Service request submitted successfully.",
      serviceRequest: {
        id: sr._id,
        referenceNumber: sr.referenceNumber,
        status: sr.status,
        serviceType: sr.serviceType,
        requestType: sr.requestType,
        department: department.name,
        district: district.name,
        createdAt: sr.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMyServiceRequests = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const serviceRequests = await ServiceRequest.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .populate("department", "name code")
      .populate("district", "name state")
      .lean();

    res.status(200).json({ success: true, serviceRequests });
  } catch (err) {
    next(err);
  }
};

export const getServiceRequestById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sr = await ServiceRequest.findById(req.params.id)
      .populate("department", "name code")
      .populate("district", "name state")
      .lean();

    if (!sr) {
      res
        .status(404)
        .json({ success: false, message: "Service request not found." });
      return;
    }

    if (req.user!.role === "citizen" && sr.userId.toString() !== req.user!.id) {
      res.status(403).json({ success: false, message: "Access denied." });
      return;
    }

    res.status(200).json({ success: true, serviceRequest: sr });
  } catch (err) {
    next(err);
  }
};
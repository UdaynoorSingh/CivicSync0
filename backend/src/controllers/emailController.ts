/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from "express";
import { isValidObjectId } from "mongoose";
import { Payment } from "../models/Payment";
import { Complaint } from "../models/Complaint";
import { ServiceRequest } from "../models/ServiceRequest";
import {
  sendEmail,
  generatePaymentReceiptEmail,
  generateDocumentEmail,
} from "../services/emailService";
import {
  generateReceiptPdf,
} from "../controllers/paymentController";

export const sendPaymentReceiptByEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { paymentId, email } = req.body as {
      paymentId?: string;
      email?: string;
    };

    if (!paymentId || !email) {
      res.status(400).json({
        success: false,
        message: "paymentId and email are required.",
      });
      return;
    }

    if (!isValidObjectId(paymentId)) {
      res.status(400).json({ success: false, message: "Invalid payment id." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: "Invalid email address." });
      return;
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      userId: req.user!.id,
    })
      .populate("billId", "billNumber")
      .populate("serviceRequestId", "referenceNumber")
      .lean();

    if (!payment) {
      res.status(404).json({ success: false, message: "Payment not found." });
      return;
    }

    if (payment.status !== "success") {
      res.status(400).json({
        success: false,
        message: "Receipt is available after successful payment only.",
      });
      return;
    }

    const referenceValue =
      payment.paymentFor === "bill"
        ? String((payment.billId as { billNumber?: string } | null)?.billNumber ?? "N/A")
        : String((payment.serviceRequestId as { referenceNumber?: string } | null)?.referenceNumber ?? "N/A");

    const pdfBuffer = await generateReceiptPdf({
      receiptNumber: payment.receiptNumber,
      paymentId: payment._id.toString(),
      paymentFor: payment.paymentFor,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      paidAt: payment.paidAt,
      referenceLabel: payment.paymentFor === "bill" ? "Bill Number:" : "Service Request Ref:",
      referenceValue,
      userId: req.user!.id,
    });

    const emailContent = generatePaymentReceiptEmail({
      receiptNumber: payment.receiptNumber,
      paymentId: payment._id.toString(),
      paymentFor: payment.paymentFor,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      paidAt: payment.paidAt ? new Date(payment.paidAt) : undefined,
      referenceValue,
    });

    await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      attachments: [
        {
          filename: `${payment.receiptNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: `Receipt sent to ${email}`,
    });
  } catch (err) {
    next(err);
  }
};

export const sendComplaintPDFByEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { complaintId, email } = req.body as {
      complaintId?: string;
      email?: string;
    };

    if (!complaintId || !email) {
      res.status(400).json({
        success: false,
        message: "complaintId and email are required.",
      });
      return;
    }

    if (!isValidObjectId(complaintId)) {
      res.status(400).json({ success: false, message: "Invalid complaint id." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: "Invalid email address." });
      return;
    }

    const complaint = await Complaint.findOne({
      _id: complaintId,
      userId: req.user!.id,
    })
      .populate("department", "name code")
      .populate("district", "name state")
      .lean();

    if (!complaint) {
      res.status(404).json({ success: false, message: "Complaint not found." });
      return;
    }

    const emailContent = generateDocumentEmail("Complaint", complaint.referenceNumber);

    const { generateComplaintPdf } = await import("../scripts/generateComplaintPdf");
    const pdfBuffer = await generateComplaintPdf({
      _id: complaint._id,
      referenceNumber: complaint.referenceNumber,
      category: complaint.category,
      description: complaint.description,
      status: complaint.status,
      urgency: complaint.urgency,
      createdAt: String(complaint.createdAt),
      resolvedAt: complaint.resolvedAt ? String(complaint.resolvedAt) : undefined,
      department: complaint.department as { name?: string; code?: string } | undefined,
      district: complaint.district as { name?: string; state?: string } | undefined,
      address: complaint.address,
      statusHistory: (complaint.statusHistory ?? []).map((h) => ({
        status: h.status,
        note: h.note,
        timestamp: String(h.timestamp),
      })),
    });

    await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      attachments: [
        {
          filename: `CivicSync_${complaint.referenceNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: `Complaint PDF sent to ${email}`,
    });
  } catch (err) {
    next(err);
  }
};

export const sendServiceRequestPDFByEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { serviceRequestId, email } = req.body as {
      serviceRequestId?: string;
      email?: string;
    };

    if (!serviceRequestId || !email) {
      res.status(400).json({
        success: false,
        message: "serviceRequestId and email are required.",
      });
      return;
    }

    if (!isValidObjectId(serviceRequestId)) {
      res.status(400).json({ success: false, message: "Invalid service request id." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: "Invalid email address." });
      return;
    }

    const serviceRequest = await ServiceRequest.findOne({
      _id: serviceRequestId,
      userId: req.user!.id,
    })
      .populate("department", "name code")
      .populate("district", "name state")
      .lean();

    if (!serviceRequest) {
      res.status(404).json({ success: false, message: "Service request not found." });
      return;
    }

    const emailContent = generateDocumentEmail("Service Request", serviceRequest.referenceNumber);

    const { generateServiceRequestPdf } = await import("../scripts/generateServiceRequestPdf");
    const pdfBuffer = await generateServiceRequestPdf({
      _id: serviceRequest._id,
      referenceNumber: serviceRequest.referenceNumber,
      serviceType: serviceRequest.serviceType,
      requestType: serviceRequest.requestType,
      applicantName: serviceRequest.applicantName,
      contactPhone: serviceRequest.contactPhone,
      status: serviceRequest.status,
      createdAt: String(serviceRequest.createdAt),
      estimatedCompletionDate: serviceRequest.estimatedCompletionDate ? String(serviceRequest.estimatedCompletionDate) : undefined,
      completedAt: serviceRequest.completedAt ? String(serviceRequest.completedAt) : undefined,
      department: serviceRequest.department as { name?: string; code?: string } | undefined,
      district: serviceRequest.district as { name?: string; state?: string } | undefined,
      address: serviceRequest.address,
      statusHistory: (serviceRequest.statusHistory ?? []).map((h) => ({
        status: h.status,
        note: h.note,
        timestamp: String(h.timestamp),
      })),
    });

    await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      attachments: [
        {
          filename: `CivicSync_${serviceRequest.referenceNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: `Service Request PDF sent to ${email}`,
    });
  } catch (err) {
    next(err);
  }
};

export const sendCustomPDFByEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, subject, docType, refNumber } = req.body;

    if (!email) {
      res.status(400).json({ success: false, message: "email is required." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: "Invalid email address." });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: "PDF attachment is required." });
      return;
    }

    const emailContent = generateDocumentEmail(docType || "Document", refNumber || "N/A");
    const mailSubject = subject || emailContent.subject;

    await sendEmail({
      to: email,
      subject: mailSubject,
      html: emailContent.html,
      attachments: [
        {
          filename: req.file.originalname || "document.pdf",
          content: req.file.buffer,
          contentType: "application/pdf",
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: `${docType || "Document"} sent to ${email}`,
    });
  } catch (err) {
    next(err);
  }
};
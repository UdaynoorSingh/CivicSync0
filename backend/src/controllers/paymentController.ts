/// <reference path="../types/express.d.ts" />
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { isValidObjectId } from "mongoose";
import PDFDocument from "pdfkit";
import { Bill } from "../models/Bill";
import { Payment } from "../models/Payment";
import { ServiceRequest } from "../models/ServiceRequest";
import type { PaymentFor, PaymentMethod } from "../models/Payment";
import {
  getRazorpayClient,
  getRazorpayCredentials,
} from "../config/razorpay";

const normalizeMethod = (method?: string): PaymentMethod | undefined => {
  if (method === "upi" || method === "card" || method === "netbanking") {
    return method;
  }
  return undefined;
};

const generateReceiptNumber = async (): Promise<string> => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  for (let i = 0; i < 10; i += 1) {
    const suffix = Math.floor(100000 + Math.random() * 900000);
    const receiptNumber = `RCP-${date}-${suffix}`;
    const exists = await Payment.exists({ receiptNumber });
    if (!exists) return receiptNumber;
  }

  throw new Error("Failed to generate a unique receipt number.");
};

const generateReceiptPdf = (input: {
  receiptNumber: string;
  paymentId: string;
  paymentFor: string;
  amount: number;
  method?: string;
  status: string;
  paidAt?: Date;
  referenceLabel: string;
  referenceValue: string;
  userId: string;
}): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));

    doc.info.Title = `CivicSync Receipt ${input.receiptNumber}`;
    doc.info.Author = "CivicSync";
    doc.info.Subject = "Payment Receipt";

    doc.fontSize(22).fillColor("#1E3A5F").text("CivicSync", { align: "left" });
    doc
      .fontSize(11)
      .fillColor("#6B7280")
      .text("Official Payment Receipt", { align: "left" });

    doc.moveDown(1.2);
    doc
      .lineWidth(1)
      .strokeColor("#E5E7EB")
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    doc.moveDown(1);

    const addRow = (label: string, value: string) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#111827")
        .text(label, 50, doc.y, { continued: true, width: 170 });
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#374151")
        .text(value, { width: 350 });
      doc.moveDown(0.35);
    };

    addRow("Receipt Number:", input.receiptNumber);
    addRow("Payment ID:", input.paymentId);
    addRow("Payment For:", input.paymentFor);
    addRow("Amount:", `INR ${input.amount.toFixed(2)}`);
    addRow("Method:", input.method ?? "N/A");
    addRow("Status:", input.status.toUpperCase());
    addRow(
      "Paid At:",
      input.paidAt
        ? new Date(input.paidAt).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "N/A",
    );
    addRow(input.referenceLabel, input.referenceValue);
    addRow("User ID:", input.userId);

    doc.moveDown(0.8);
    doc
      .lineWidth(1)
      .strokeColor("#E5E7EB")
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    doc.moveDown(1);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#6B7280")
      .text(
        "This is a system-generated receipt. For support, contact CivicSync Help Center.",
      );

    doc.end();
  });

export const getRazorpayKey = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { keyId } = getRazorpayCredentials();
    res.status(200).json({ success: true, keyId });
  } catch (err) {
    next(err);
  }
};

export const createPaymentOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { paymentFor, billId, serviceRequestId } = req.body as {
      paymentFor?: PaymentFor;
      billId?: string;
      serviceRequestId?: string;
    };

    if (!paymentFor || !["bill", "service_request"].includes(paymentFor)) {
      res.status(400).json({ success: false, message: "Invalid paymentFor." });
      return;
    }

    if (paymentFor === "bill" && !billId) {
      res
        .status(400)
        .json({ success: false, message: "billId is required for bill payment." });
      return;
    }

    if (paymentFor === "service_request" && !serviceRequestId) {
      res.status(400).json({
        success: false,
        message: "serviceRequestId is required for service request payment.",
      });
      return;
    }

    if (billId && !isValidObjectId(billId)) {
      res.status(400).json({ success: false, message: "Invalid billId." });
      return;
    }

    if (serviceRequestId && !isValidObjectId(serviceRequestId)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid serviceRequestId." });
      return;
    }

    let amount = 0;
    let resolvedBillId: string | undefined;
    let resolvedServiceRequestId: string | undefined;

    if (paymentFor === "bill" && billId) {
      const bill = await Bill.findOne({ _id: billId, userId: req.user!.id });
      if (!bill) {
        res.status(404).json({ success: false, message: "Bill not found." });
        return;
      }
      if (bill.status === "paid") {
        res.status(400).json({ success: false, message: "Bill is already paid." });
        return;
      }
      amount = bill.amount;
      resolvedBillId = bill._id.toString();
    }

    if (paymentFor === "service_request" && serviceRequestId) {
      const sr = await ServiceRequest.findOne({
        _id: serviceRequestId,
        userId: req.user!.id,
      });
      if (!sr) {
        res
          .status(404)
          .json({ success: false, message: "Service request not found." });
        return;
      }
      if (sr.paymentId) {
        res.status(400).json({
          success: false,
          message: "Payment is already linked with this service request.",
        });
        return;
      }
      amount = sr.applicationFee;
      resolvedServiceRequestId = sr._id.toString();
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid payable amount. Please contact support.",
      });
      return;
    }

    const razorpay = getRazorpayClient();
    const receiptNumber = await generateReceiptNumber();
    const amountInPaise = Math.round(amount * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: receiptNumber,
      notes: {
        userId: req.user!.id,
        paymentFor,
        billId: resolvedBillId ?? "",
        serviceRequestId: resolvedServiceRequestId ?? "",
      },
    });

    const payment = await Payment.create({
      userId: req.user!.id,
      paymentFor,
      billId: resolvedBillId,
      serviceRequestId: resolvedServiceRequestId,
      razorpayOrderId: order.id,
      amount,
      currency: "INR",
      status: "initiated",
      receiptNumber,
    });

    const { keyId } = getRazorpayCredentials();

    res.status(201).json({
      success: true,
      message: "Payment order created.",
      keyId,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      payment: {
        id: payment._id,
        paymentFor: payment.paymentFor,
        amount: payment.amount,
        status: payment.status,
        receiptNumber: payment.receiptNumber,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const verifyPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
      };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({
        success: false,
        message:
          "razorpay_order_id, razorpay_payment_id and razorpay_signature are required.",
      });
      return;
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: req.user!.id,
    });
    if (!payment) {
      res.status(404).json({ success: false, message: "Payment not found." });
      return;
    }

    const { keySecret } = getRazorpayCredentials();
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isValidSignature =
      expectedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(razorpay_signature),
      );

    if (!isValidSignature) {
      payment.status = "failed";
      payment.failureReason = "Invalid Razorpay signature.";
      await payment.save();

      res.status(400).json({
        success: false,
        message: "Payment signature verification failed.",
      });
      return;
    }

    if (payment.status !== "success") {
      const razorpay = getRazorpayClient();
      let method: PaymentMethod | undefined;

      try {
        const gatewayPayment = (await razorpay.payments.fetch(
          razorpay_payment_id,
        )) as { method?: string };
        method = normalizeMethod(gatewayPayment.method);
      } catch (_error) {
        method = undefined;
      }

      payment.status = "success";
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      payment.method = method;
      payment.paidAt = new Date();
      payment.failureReason = undefined;
      await payment.save();

      if (payment.billId) {
        await Bill.findByIdAndUpdate(payment.billId, {
          status: "paid",
          paidAt: payment.paidAt,
          paymentId: payment._id,
          gatewayPaymentId: razorpay_payment_id,
        });
      }

      if (payment.serviceRequestId) {
        await ServiceRequest.findByIdAndUpdate(payment.serviceRequestId, {
          paymentId: payment._id,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Payment verified successfully.",
      payment: {
        id: payment._id,
        paymentFor: payment.paymentFor,
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
        receiptNumber: payment.receiptNumber,
        receiptUrl: payment.receiptUrl,
        paidAt: payment.paidAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/payment/verify-payment
// Dedicated bill verification endpoint for Razorpay callback payload from frontend.
export const verifyBillPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, billId } =
      req.body as {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
        billId?: string;
      };

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !billId
    ) {
      res.status(400).json({
        success: false,
        message:
          "razorpay_order_id, razorpay_payment_id, razorpay_signature and billId are required.",
      });
      return;
    }

    if (!isValidObjectId(billId)) {
      res.status(400).json({ success: false, message: "Invalid billId." });
      return;
    }

    // Never trust billId from frontend without ownership check.
    const bill = await Bill.findOne({ _id: billId, userId: req.user!.id });
    if (!bill) {
      res.status(404).json({ success: false, message: "Bill not found." });
      return;
    }

    // Ensure the order belongs to this bill + user + bill-payment flow.
    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: req.user!.id,
      paymentFor: "bill",
      billId,
    });
    if (!payment) {
      res.status(404).json({ success: false, message: "Payment order not found." });
      return;
    }

    const { keySecret } = getRazorpayCredentials();
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isValidSignature =
      expectedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(razorpay_signature),
      );

    if (!isValidSignature) {
      payment.status = "failed";
      payment.failureReason = "Invalid Razorpay signature.";
      await payment.save();

      res.status(400).json({ success: false, message: "Invalid signature" });
      return;
    }

    const paidAt = new Date();

    payment.status = "success";
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.paidAt = paidAt;
    payment.failureReason = undefined;
    await payment.save();

    bill.status = "paid";
    bill.paidAt = paidAt;
    bill.paymentId = payment._id;
    bill.gatewayPaymentId = razorpay_payment_id;
    await bill.save();

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const markPaymentFailed = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { razorpay_order_id, reason } = req.body as {
      razorpay_order_id?: string;
      reason?: string;
    };

    if (!razorpay_order_id) {
      res
        .status(400)
        .json({ success: false, message: "razorpay_order_id is required." });
      return;
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: req.user!.id,
    });
    if (!payment) {
      res.status(404).json({ success: false, message: "Payment not found." });
      return;
    }

    if (payment.status === "success") {
      res.status(400).json({
        success: false,
        message: "Cannot mark a successful payment as failed.",
      });
      return;
    }

    payment.status = "failed";
    payment.failureReason = reason ?? "Payment failed.";
    await payment.save();

    res.status(200).json({
      success: true,
      message: "Payment marked as failed.",
      payment: { id: payment._id, status: payment.status },
    });
  } catch (err) {
    next(err);
  }
};

export const getMyPayments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const payments = await Payment.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .populate("billId", "billNumber amount dueDate status")
      .populate("serviceRequestId", "referenceNumber serviceType status")
      .lean();

    res.status(200).json({ success: true, payments });
  } catch (err) {
    next(err);
  }
};

export const getPaymentById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, message: "Invalid payment id." });
      return;
    }

    const payment = await Payment.findOne({
      _id: req.params.id,
      userId: req.user!.id,
    })
      .populate("billId", "billNumber amount dueDate status")
      .populate("serviceRequestId", "referenceNumber serviceType status")
      .lean();

    if (!payment) {
      res.status(404).json({ success: false, message: "Payment not found." });
      return;
    }

    res.status(200).json({ success: true, payment });
  } catch (err) {
    next(err);
  }
};

export const downloadPaymentReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ success: false, message: "Invalid payment id." });
      return;
    }

    const payment = await Payment.findOne({
      _id: req.params.id,
      userId: req.user!.id,
    })
      .populate("billId", "billNumber dueDate")
      .populate("serviceRequestId", "referenceNumber serviceType")
      .lean();

    if (!payment) {
      res.status(404).json({ success: false, message: "Payment not found." });
      return;
    }

    if (payment.status !== "success") {
      res
        .status(400)
        .json({ success: false, message: "Receipt is available after successful payment only." });
      return;
    }

    const referenceLabel =
      payment.paymentFor === "bill" ? "Bill Number:" : "Service Request Ref:";
    const referenceValue =
      payment.paymentFor === "bill"
        ? String(
            (payment.billId as { billNumber?: string } | null)?.billNumber ??
              "N/A",
          )
        : String(
            (payment.serviceRequestId as { referenceNumber?: string } | null)
              ?.referenceNumber ?? "N/A",
          );

    const pdfBuffer = await generateReceiptPdf({
      receiptNumber: payment.receiptNumber,
      paymentId: payment._id.toString(),
      paymentFor: payment.paymentFor,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      paidAt: payment.paidAt,
      referenceLabel,
      referenceValue,
      userId: req.user!.id,
    });

    const filename = `${payment.receiptNumber}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    res.setHeader("Content-Length", String(pdfBuffer.length));
    res.status(200).send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

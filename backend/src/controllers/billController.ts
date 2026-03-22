/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from "express";
import { isValidObjectId } from "mongoose";
import { Bill } from "../models/Bill";

const deriveBillStatus = (
  status: "pending" | "paid" | "overdue",
  dueDate: Date,
): "pending" | "paid" | "overdue" => {
  if (status === "paid") return "paid";
  if (status === "overdue") return "overdue";
  return dueDate.getTime() < Date.now() ? "overdue" : "pending";
};

export const getMyBills = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status } = req.query as { status?: string };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { userId: req.user!.id };
    if (status && ["pending", "paid", "overdue"].includes(status)) {
      filter.status = status;
    }

    const bills = await Bill.find(filter)
      .sort({ dueDate: 1, createdAt: -1 })
      .populate("department", "name code")
      .lean();

    const normalizedBills = bills.map((bill) => ({
      ...bill,
      status: deriveBillStatus(
        bill.status,
        bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate),
      ),
    }));

    res.status(200).json({ success: true, bills: normalizedBills });
  } catch (err) {
    next(err);
  }
};

export const getBillById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid bill id." });
      return;
    }

    const bill = await Bill.findOne({ _id: id, userId: req.user!.id })
      .populate("department", "name code")
      .populate("district", "name state")
      .lean();

    if (!bill) {
      res.status(404).json({ success: false, message: "Bill not found." });
      return;
    }

    const normalizedBill = {
      ...bill,
      status: deriveBillStatus(
        bill.status,
        bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate),
      ),
    };

    res.status(200).json({ success: true, bill: normalizedBill });
  } catch (err) {
    next(err);
  }
};

import { Model, Document } from "mongoose";
import { Complaint } from "../models/Complaint";

/**
 * Generates a unique daily-sequential reference number.
 * Format: <PREFIX>-YYYYMMDD-XXXXX  e.g. COMP-20260226-00001  /  SRQ-20260226-00002
 *
 * @param prefix  3–4 char uppercase prefix ("COMP", "SRQ", …)
 * @param model   Mongoose model to count existing docs for today's sequence
 */
export const generateRefNumber = async (
  prefix: string = "COMP",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any> = Complaint as unknown as Model<any>,
): Promise<string> => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // e.g. "20260226"
  const fullPrefix = `${prefix}-${date}-`;

  const count = await model.countDocuments({
    referenceNumber: new RegExp(`^${fullPrefix}`),
  });

  const seq = String(count + 1).padStart(5, "0");
  return `${fullPrefix}${seq}`;
};

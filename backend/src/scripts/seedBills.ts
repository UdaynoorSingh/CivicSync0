import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../models/User";
import { Bill } from "../models/Bill";
import { Department } from "../models/Department";

interface SeedOptions {
  month: number;
  year: number;
  overwrite: boolean;
  onlyUserId?: string;
}

const DEPARTMENT_BASE_CHARGES: Record<string, number> = {
  ELEC: 1200,
  WATER: 320,
  GAS: 900,
  SANITATION: 220,
  WASTE: 160,
};

const parseArgs = (): SeedOptions => {
  const now = new Date();
  const monthArg = Number(process.argv[2] ?? now.getMonth() + 1);
  const yearArg = Number(process.argv[3] ?? now.getFullYear());
  const overwrite = process.argv.includes("--overwrite");

  const userArgIndex = process.argv.findIndex((v) => v === "--user");
  const onlyUserId =
    userArgIndex > -1 && process.argv[userArgIndex + 1]
      ? process.argv[userArgIndex + 1]
      : undefined;

  if (!Number.isInteger(monthArg) || monthArg < 1 || monthArg > 12) {
    throw new Error("Month must be between 1 and 12.");
  }

  if (!Number.isInteger(yearArg) || yearArg < 2000 || yearArg > 2100) {
    throw new Error("Year must be between 2000 and 2100.");
  }

  return { month: monthArg, year: yearArg, overwrite, onlyUserId };
};

const monthLabel = (year: number, month: number): string => {
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleString("en-IN", { month: "short", year: "numeric" });
};

const makeBillNumber = (
  deptCode: string,
  year: number,
  month: number,
  connectionNumber: string,
): string => {
  const suffix = connectionNumber.replace(/[^A-Za-z0-9]/g, "").slice(-6);
  return `${deptCode}-${year}${String(month).padStart(2, "0")}-${suffix}`;
};

const findBaseCharge = (deptCode: string): number => {
  return DEPARTMENT_BASE_CHARGES[deptCode] ?? 250;
};

const generateCharges = (deptCode: string): { currentCharges: number; taxes: number } => {
  const base = findBaseCharge(deptCode);
  const variance = Math.floor(Math.random() * 140) - 30;
  const currentCharges = Math.max(50, base + variance);
  const taxes = Math.round(currentCharges * 0.12);
  return { currentCharges, taxes };
};

async function seedBills(): Promise<void> {
  const opts = parseArgs();
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing in backend/.env");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");

  const periodFrom = new Date(Date.UTC(opts.year, opts.month - 1, 1));
  const periodTo = new Date(Date.UTC(opts.year, opts.month, 0, 23, 59, 59, 999));
  const dueDate = new Date(Date.UTC(opts.year, opts.month, 10, 23, 59, 59, 999));
  const label = monthLabel(opts.year, opts.month);

  const userFilter = opts.onlyUserId ? { _id: opts.onlyUserId } : {};
  const users = await User.find(userFilter)
    .select("_id district utilityConnections name mobile")
    .lean();

  if (!users.length) {
    console.log("No users found for bill seeding.");
    await mongoose.disconnect();
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    const connections = user.utilityConnections ?? [];
    if (!connections.length) continue;

    for (const conn of connections) {
      const dept = await Department.findById(conn.department)
        .select("_id code")
        .lean();
      if (!dept) continue;

      const billNumber = makeBillNumber(
        dept.code,
        opts.year,
        opts.month,
        conn.connectionNumber,
      );

      const existing = await Bill.findOne({ billNumber }).select("_id").lean();

      if (existing && !opts.overwrite) {
        skipped += 1;
        continue;
      }

      const { currentCharges, taxes } = generateCharges(dept.code);
      const previousBalance = 0;
      const amount = previousBalance + currentCharges + taxes;

      if (existing && opts.overwrite) {
        await Bill.findByIdAndUpdate(existing._id, {
          userId: user._id,
          department: dept._id,
          district: user.district,
          connectionNumber: conn.connectionNumber,
          billNumber,
          billingPeriod: {
            from: periodFrom,
            to: periodTo,
            label,
          },
          previousBalance,
          currentCharges,
          taxes,
          amount,
          dueDate,
          status: "pending",
          paidAt: undefined,
          paymentId: undefined,
        });
        created += 1;
      } else {
        await Bill.create({
          userId: user._id,
          department: dept._id,
          district: user.district,
          connectionNumber: conn.connectionNumber,
          billNumber,
          billingPeriod: {
            from: periodFrom,
            to: periodTo,
            label,
          },
          previousBalance,
          currentCharges,
          taxes,
          amount,
          dueDate,
          status: "pending",
        });
        created += 1;
      }
    }
  }

  console.log(`Seed finished: created/updated=${created}, skipped=${skipped}`);
  console.log(
    `Period=${label}, overwrite=${opts.overwrite ? "yes" : "no"}, users=${users.length}`,
  );

  await mongoose.disconnect();
}

seedBills().catch(async (err) => {
  console.error("seed-bills failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});

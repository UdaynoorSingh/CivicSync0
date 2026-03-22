import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { District } from "../models/District";
import { Department } from "../models/Department";
import { Admin } from "../models/Admin";

// ─── District Data ─────────────────────────────────────────────────────────────
const DISTRICTS: Record<
  string,
  {
    name: string;
    state: string;
    stateCode: string;
    pinCodes: string[];
    coordinates: { latitude: number; longitude: number };
  }
> = {
  haryana: {
    name: "Haryana",
    state: "Haryana",
    stateCode: "HR",
    pinCodes: ["132001", "132103", "133001", "122001"],
    coordinates: { latitude: 29.0588, longitude: 76.0856 },
  },
  punjab: {
    name: "Punjab",
    state: "Punjab",
    stateCode: "PB",
    pinCodes: ["141001", "143001", "144001", "160055"],
    coordinates: { latitude: 31.1471, longitude: 75.3412 },
  },
  delhi: {
    name: "Delhi",
    state: "Delhi",
    stateCode: "DL",
    pinCodes: ["110001", "110017", "110007", "110031"],
    coordinates: { latitude: 28.7041, longitude: 77.1025 },
  },
  uttar_pradesh: {
    name: "Uttar Pradesh",
    state: "Uttar Pradesh",
    stateCode: "UP",
    pinCodes: ["201301", "201001", "226001", "221001"],
    coordinates: { latitude: 26.8467, longitude: 80.9462 },
  },
};

// ─── Department Data (shared across all districts) ─────────────────────────────
const DEPARTMENTS = [
  {
    code: "ELEC" as const,
    name: "Electricity",
    description: "Electricity supply, outage management and new connections",
    serviceCategories: [
      "power_outage",
      "streetlight",
      "meter_issue",
      "new_connection",
    ],
  },
  {
    code: "WATER" as const,
    name: "Water Supply",
    description: "Water supply, pipeline leakage and water quality complaints",
    serviceCategories: [
      "water_leakage",
      "water_contamination",
      "low_pressure",
      "new_connection",
    ],
  },
  {
    code: "GAS" as const,
    name: "Gas Supply",
    description: "PNG gas supply, gas leaks and new gas connections",
    serviceCategories: ["gas_leak", "gas_pressure_issue", "new_connection"],
  },
  {
    code: "SANITATION" as const,
    name: "Sanitation",
    description: "Drainage, sewage overflow and sanitation complaints",
    serviceCategories: ["sewage_overflow", "blocked_drain", "public_toilet"],
  },
  {
    code: "WASTE" as const,
    name: "Waste Management",
    description: "Garbage collection, waste disposal and cleanliness",
    serviceCategories: [
      "garbage_collection",
      "illegal_dumping",
      "road_cleaning",
    ],
  },
];

const ADMIN_PASSWORD = "Admin@1234";

// ─── CLI Arg ───────────────────────────────────────────────────────────────────
const districtKey = (process.argv[2] ?? "").toLowerCase();
const districtData = DISTRICTS[districtKey];

if (!districtKey || !districtData) {
  console.error(`Usage: npx ts-node src/scripts/seed.ts <district>`);
  console.error(`Available districts: ${Object.keys(DISTRICTS).join(", ")}`);
  process.exit(1);
}

// ─── Seed ──────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGO_URI!);
  console.log("✅  MongoDB connected\n");

  // 1. Upsert District
  const district = await District.findOneAndUpdate(
    { name: districtData.name, state: districtData.state },
    { $setOnInsert: districtData },
    { upsert: true, returnDocument: "after" },
  );
  console.log(
    `📍  District: ${district!.name}, ${district!.state} (${district!._id})`,
  );

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const slug = districtData.name.toLowerCase();

  // 2. Upsert Departments + Admins
  for (const deptData of DEPARTMENTS) {
    const dept = await Department.findOneAndUpdate(
      { code: deptData.code },
      { $setOnInsert: deptData },
      { upsert: true, returnDocument: "after" },
    );

    const username = `${slug}_${deptData.code.toLowerCase()}`;
    const email = `${deptData.code.toLowerCase()}@${slug}.civicsync.gov.in`;

    const existing = await Admin.findOne({ username });
    if (existing) {
      console.log(`  ↩  ${username} already exists — skipped`);
    } else {
      await Admin.create({
        name: `${deptData.name} Admin – ${districtData.name}`,
        username,
        email,
        password: hashedPassword,
        department: dept!._id,
        district: district!._id,
        role: "admin",
        isActive: true,
      });
      console.log(`  ✅  ${username}  (pwd: ${ADMIN_PASSWORD})`);
    }
  }

  console.log(`\n🎉  Done seeding ${districtData.name}!\n`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});

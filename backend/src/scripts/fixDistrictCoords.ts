/**
 * One-time migration: update all existing District records that still have
 * the old generic India-centre default (20.5937, 78.9629) with the correct
 * state-centre coordinates from stateCoordinates.ts.
 *
 * Usage:  npx ts-node src/scripts/fixDistrictCoords.ts
 */

import "dotenv/config";
import mongoose from "mongoose";
import { District } from "../models/District";
import { STATE_COORDINATES } from "../utils/stateCoordinates";

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI not set");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const districts = await District.find({});
  let updated = 0;

  for (const d of districts) {
    // Find matching state coordinates (case-insensitive)
    const key = Object.keys(STATE_COORDINATES).find(
      (k) => k.toLowerCase() === d.name.trim().toLowerCase(),
    );

    if (!key) {
      console.log(`  ⚠  No coord match for "${d.name}" — skipping`);
      continue;
    }

    const target = STATE_COORDINATES[key];
    const hasOldDefault =
      d.coordinates.latitude === 20.5937 &&
      d.coordinates.longitude === 78.9629;

    // Also fix the old Haryana-specific default (29.6857, 76.9905)
    const hasHaryanaDefault =
      d.coordinates.latitude === 29.6857 &&
      d.coordinates.longitude === 76.9905;

    if (hasOldDefault || hasHaryanaDefault) {
      d.coordinates = { latitude: target.lat, longitude: target.lng };
      await d.save();
      updated++;
      console.log(`  ✅  Fixed "${d.name}" → (${target.lat}, ${target.lng})`);
    } else {
      console.log(`  ✓  "${d.name}" already has valid coords (${d.coordinates.latitude}, ${d.coordinates.longitude})`);
    }
  }

  console.log(`\nDone. Updated ${updated} of ${districts.length} district(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

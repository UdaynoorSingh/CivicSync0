import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("❌  MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅  MongoDB connected → ${conn.connection.host}`);
  } catch (err) {
    console.error("❌  MongoDB connection failed:", err);
    process.exit(1);
  }
};

export default connectDB;

import mongoose from "mongoose";

export async function connectDatabase(uri) {
  if (!uri) {
    throw new Error("MONGODB_URI is missing. Add it to your environment before starting the API.");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
}

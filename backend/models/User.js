import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "engineer", "viewer"],
      default: "viewer",
    },
    department: { type: String, default: "IT" },
    avatar: { type: String, default: "" },
    lastLogin: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export const UserModel = mongoose.models.User || mongoose.model("User", userSchema);

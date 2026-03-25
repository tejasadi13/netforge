import mongoose from "mongoose";

const topologySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    date: { type: String, required: true },
    ownerId: { type: String, default: "" },
    ownerName: { type: String, default: "" },
    topology: { type: mongoose.Schema.Types.Mixed, required: true },
    routerConfig: { type: String, required: true },
    switchConfig: { type: String, required: true },
    securityScore: { type: Number, required: true },
    securityStatus: { type: String, required: true },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export const TopologyModel = mongoose.models.Topology || mongoose.model("Topology", topologySchema);

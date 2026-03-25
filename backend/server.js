import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { connectDatabase } from "./config/db.js";
import { TopologyModel } from "./models/Topology.js";
import { UserModel } from "./models/User.js";
import { generateAiAssistantReply } from "./services/aiAssistant.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json({ limit: "4mb" }));

function sanitizeUser(user, topologyCount = 0) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    avatar: user.avatar,
    lastLogin: user.lastLogin instanceof Date ? user.lastLogin.toISOString() : user.lastLogin,
    topologiesCreated: topologyCount,
  };
}

async function getTopologyCountForUser(userId) {
  return TopologyModel.countDocuments({ ownerId: userId });
}

async function buildUserResponse(user) {
  const topologyCount = await getTopologyCountForUser(user.id);
  return sanitizeUser(user, topologyCount);
}

async function ensureSeedUsers() {
  const defaults = [
    {
      id: "1",
      name: "TEJA SADI",
      email: "admin@netforge.io",
      password: "admin123",
      role: "admin",
      department: "IT",
    },
    {
      id: "2",
      name: "Jamie Chen",
      email: "engineer@netforge.io",
      password: "eng123",
      role: "engineer",
      department: "Data Center",
    },
    {
      id: "3",
      name: "Sam Rivera",
      email: "viewer@netforge.io",
      password: "view123",
      role: "viewer",
      department: "HR",
    },
  ];

  for (const item of defaults) {
    const existing = await UserModel.findOne({ email: item.email });
    if (existing) continue;

    const passwordHash = await bcrypt.hash(item.password, 10);
    await UserModel.create({
      id: item.id,
      name: item.name,
      email: item.email,
      passwordHash,
      role: item.role,
      department: item.department,
      avatar: "",
      lastLogin: new Date(),
    });
  }
}

app.get("/api/health", async (_req, res) => {
  res.json({ ok: true, service: "netforge-api" });
});

app.post("/api/ai/chat", async (req, res, next) => {
  try {
    const { question, topology, history } = req.body;

    if (!String(question || "").trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    const reply = await generateAiAssistantReply({ question, topology, history });
    res.json(reply);
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email: String(email).toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    user.lastLogin = new Date();
    await user.save();

    res.json(await buildUserResponse(user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { name, email, password, department } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();

    const exists = await UserModel.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({ error: "A user with that email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      id: Date.now().toString(),
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      role: "viewer",
      department: String(department || "IT").trim() || "IT",
      avatar: "",
      lastLogin: new Date(),
    });

    res.status(201).json(await buildUserResponse(user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/users", async (_req, res, next) => {
  try {
    const users = await UserModel.find().sort({ createdAt: 1 });
    const payload = await Promise.all(users.map((user) => buildUserResponse(user)));
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get("/api/users/:id", async (req, res, next) => {
  try {
    const user = await UserModel.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(await buildUserResponse(user));
  } catch (error) {
    next(error);
  }
});

app.post("/api/users", async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();

    const exists = await UserModel.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({ error: "A user with that email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      id: Date.now().toString(),
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      role: ["admin", "engineer", "viewer"].includes(role) ? role : "viewer",
      department: String(department || "IT").trim() || "IT",
      avatar: "",
      lastLogin: new Date(),
    });

    res.status(201).json(await buildUserResponse(user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/users/:id", async (req, res, next) => {
  try {
    const { name, department, avatar, role } = req.body;
    const user = await UserModel.findOne({ id: req.params.id });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (name) user.name = String(name).trim();
    if (department) user.department = String(department).trim();
    if (typeof avatar === "string") user.avatar = avatar;
    if (role && ["admin", "engineer", "viewer"].includes(role)) user.role = role;

    await user.save();
    res.json(await buildUserResponse(user));
  } catch (error) {
    next(error);
  }
});

app.put("/api/users/:id/password", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await UserModel.findOne({ id: req.params.id });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/users/:id", async (req, res, next) => {
  try {
    const user = await UserModel.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === "admin") {
      const adminCount = await UserModel.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ error: "Cannot delete the last admin user" });
      }
    }

    await TopologyModel.deleteMany({ ownerId: user.id });
    await UserModel.deleteOne({ id: user.id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/topologies", async (_req, res, next) => {
  try {
    const topologies = await TopologyModel.find().sort({ createdAt: -1 }).lean();
    res.json(topologies);
  } catch (error) {
    next(error);
  }
});

app.get("/api/topologies/:id", async (req, res, next) => {
  try {
    const topology = await TopologyModel.findOne({ id: req.params.id }).lean();

    if (!topology) {
      return res.status(404).json({ error: "Topology not found" });
    }

    res.json(topology);
  } catch (error) {
    next(error);
  }
});

app.post("/api/topologies", async (req, res, next) => {
  try {
    const payload = req.body;
    const saved = await TopologyModel.findOneAndUpdate(
      { id: payload.id },
      payload,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();

    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/topologies/:id", async (req, res, next) => {
  try {
    await TopologyModel.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || "Internal server error" });
});

async function startServer() {
  await connectDatabase(process.env.MONGODB_URI);
  await ensureSeedUsers();
  app.listen(port, () => {
    console.log(`NETFORGE API listening on http://127.0.0.1:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start NETFORGE API", error);
  process.exit(1);
});

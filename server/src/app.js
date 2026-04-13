import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.js";
import bountyRoutes from "./routes/bounties.js";
import conversationRoutes from "./routes/conversations.js";
import userRoutes from "./routes/users.js";
import workbenchRoutes from "./routes/workbench.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");

app.use(cors());
app.use(express.json({ limit: "8mb" }));
app.use("/uploads", express.static(uploadsDir));
app.use("/api", (_, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

app.get("/api/health", (_, res) => {
  res.json({
    success: true,
    message: "服务运行正常",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bounties", bountyRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/workbench", workbenchRoutes);

app.use((_, res) => {
  res.status(404).json({
    success: false,
    message: "接口不存在",
  });
});

export default app;

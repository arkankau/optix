/**
 * Nearify Exam API Server
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Import routes (db will auto-initialize when imported)
import sessionRouter from "./routes/session";
import eventRouter from "./routes/event";
import voiceRouter from "./routes/voice";
import conversationRouter from "./routes/conversation";
import agentRouter from "./routes/agent";
import staircaseRouter from "./routes/staircase";
import jccRouter from "./routes/jcc";
import summaryRouter from "./routes/summary";

const app = express();
const PORT = process.env.PORT || 8787;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

// Middleware
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/session", sessionRouter);
app.use("/api/event", eventRouter);
app.use("/api/voice", voiceRouter);
app.use("/api/conversation", conversationRouter);
app.use("/api/agent", agentRouter);
app.use("/api/staircase", staircaseRouter);
app.use("/api/jcc", jccRouter);
app.use("/api/summary", summaryRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server (database already initialized)
app.listen(PORT, () => {
  console.log("\n🚀 Nearify Exam API Server");
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log(`🌐 CORS enabled for ${FRONTEND_ORIGIN}`);
  console.log("\n🎤 Voice Integrations:");
  console.log(`   - ElevenLabs TTS: ${process.env.ELEVENLABS_API_KEY ? "✅" : "⚠️  Not configured"}`);
  console.log(`   - Gemini STT/NLU: ${process.env.GEMINI_API_KEY ? "✅" : "⚠️  Not configured"}`);
  console.log(`   - xAI Grok: ${process.env.XAI_GROK_API_KEY ? "✅" : "⚠️  Not configured"}`);
  console.log("\n");
});

export default app;


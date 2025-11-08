/**
 * ElevenLabs Conversational AI routes for sphere testing
 */

import { Router } from "express";
import multer from "multer";
import {
  startConversation,
  sendAudioToConversation,
  sendTextToConversation,
  endConversation,
} from "@nearify/voice";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Store active conversations (in production, use Redis or DB)
const activeConversations = new Map<string, string>();

/**
 * POST /api/conversation/start
 * Start a new conversational AI session for sphere test
 */
router.post("/start", async (req, res) => {
  try {
    const { sessionId, eye, firstMessage } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    console.log(`🎤 Starting ElevenLabs Conversation for ${eye}`);

    const conversationId = await startConversation({
      firstMessage:
        firstMessage ||
        `Hello! Let's test your ${eye === "OD" ? "right" : "left"} eye. Please read the letters you see on the screen out loud.`,
    });

    // Store conversation ID mapped to session
    const key = `${sessionId}-${eye}`;
    activeConversations.set(key, conversationId);

    res.json({
      success: true,
      conversationId,
      message: "Conversation started",
    });
  } catch (error: any) {
    console.error("Conversation start error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/conversation/audio
 * Send audio to conversation and get AI response
 */
router.post("/audio", upload.single("audio"), async (req, res) => {
  try {
    const { sessionId, eye } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "No audio file" });
    }

    const key = `${sessionId}-${eye}`;
    const conversationId = activeConversations.get(key);

    if (!conversationId) {
      return res.status(404).json({ error: "Conversation not found. Start one first." });
    }

    // Convert buffer to Blob
    const audioBlob = new Blob([req.file.buffer], {
      type: req.file.mimetype,
    });

    console.log(`🎤 Processing audio in ElevenLabs Conversation...`);

    const result = await sendAudioToConversation(conversationId, audioBlob as any);

    console.log(`🎤 User said: "${result.text}"`);

    res.json({
      success: true,
      transcription: result.text,
      understood: result.understood,
      hasAudioResponse: result.audioResponse.byteLength > 0,
    });
  } catch (error: any) {
    console.error("Conversation audio error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/conversation/message
 * Send text message to conversation (for testing/fallback)
 */
router.post("/message", async (req, res) => {
  try {
    const { sessionId, eye, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    const key = `${sessionId}-${eye}`;
    const conversationId = activeConversations.get(key);

    if (!conversationId) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    console.log(`🎤 Sending message to AI: "${message}"`);

    const result = await sendTextToConversation(conversationId, message);

    console.log(`🎤 AI responded: "${result.responseText}"`);

    res.json({
      success: true,
      response: result.responseText,
    });
  } catch (error: any) {
    console.error("Conversation message error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/conversation/end
 * End conversation session
 */
router.post("/end", async (req, res) => {
  try {
    const { sessionId, eye } = req.body;

    const key = `${sessionId}-${eye}`;
    const conversationId = activeConversations.get(key);

    if (conversationId) {
      await endConversation(conversationId);
      activeConversations.delete(key);
      console.log(`🎤 Ended conversation for ${key}`);
    }

    res.json({
      success: true,
      message: "Conversation ended",
    });
  } catch (error: any) {
    console.error("Conversation end error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/conversation/active
 * Get active conversation count (for debugging)
 */
router.get("/active", (req, res) => {
  res.json({
    count: activeConversations.size,
    conversations: Array.from(activeConversations.keys()),
  });
});

export default router;



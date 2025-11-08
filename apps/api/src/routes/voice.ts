/**
 * Voice processing routes (TTS + STT)
 */

import { Router } from "express";
import multer from "multer";
import { ttsSpeak } from "@nearify/voice";
import { sttGemini, detectIntent } from "@nearify/voice";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/tts
 * Text-to-speech via ElevenLabs
 */
router.post("/tts", async (req, res) => {
  try {
    const { text, voiceId } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    const audioBuffer = await ttsSpeak(text, { voiceId });

    res.set("Content-Type", "audio/mpeg");
    res.send(Buffer.from(audioBuffer));
  } catch (error: any) {
    console.error("TTS error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stt
 * Speech-to-text via Gemini
 */
router.post("/stt", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file" });
    }

    // Convert buffer to base64
    const audioBase64 = req.file.buffer.toString("base64");

    const result = await sttGemini(audioBase64);

    res.json({
      success: true,
      text: result.text,
      confidence: result.confidence,
    });
  } catch (error: any) {
    console.error("STT error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/voice/intent
 * Detect intent from spoken text
 */
router.post("/intent", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    const intent = await detectIntent(text);

    res.json(intent);
  } catch (error: any) {
    console.error("Intent detection error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;



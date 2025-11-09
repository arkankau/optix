/**
 * Event logging routes
 */

import { Router } from "express";
import { eventQueries, serializeParams } from "../db";

const router = Router();

/**
 * POST /api/event
 * Log a test event
 */
router.post("/", (req, res) => {
  try {
    const {
      sessionId,
      t,
      step,
      lettersShown,
      speechText,
      correct,
      latencyMs,
      params,
    } = req.body;

    if (!sessionId || t === undefined || !step) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    eventQueries.create.run(
      sessionId,
      t,
      step,
      lettersShown || null,
      speechText || null,
      correct !== undefined ? (correct ? 1 : 0) : null,
      latencyMs || null,
      params ? serializeParams(params) : null
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error logging event:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/event/:sessionId
 * Get all events for a session
 */
router.get("/:sessionId", (req, res) => {
  try {
    const { sessionId } = req.params;
    const events = eventQueries.getBySession.all(sessionId);
    res.json(events);
  } catch (error: any) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;




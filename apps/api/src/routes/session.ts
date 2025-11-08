/**
 * Session management routes
 */

import { Router } from "express";
import { nanoid } from "nanoid";
import { sessionQueries } from "../db";

const router = Router();

/**
 * POST /api/session
 * Create a new test session
 */
router.post("/", (req, res) => {
  try {
    const { deviceInfo, distanceCm, screenPpi, lighting } = req.body;

    const sessionId = nanoid();
    const createdAt = new Date().toISOString();

    sessionQueries.create.run(
      sessionId,
      createdAt,
      deviceInfo || "Unknown",
      distanceCm || 0,
      screenPpi || 0,
      lighting || "photopic",
      "active"
    );

    console.log(`📋 Created session ${sessionId}`);

    res.json({
      success: true,
      sessionId,
      createdAt,
    });
  } catch (error: any) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/session/:id
 * Get session details
 */
router.get("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const session = sessionQueries.getById.get(id);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error: any) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/session/:id
 * Update session state
 */
router.patch("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { state } = req.body;

    if (!["active", "completed", "aborted"].includes(state)) {
      return res.status(400).json({ error: "Invalid state" });
    }

    sessionQueries.updateState.run(state, id);

    console.log(`📋 Updated session ${id} to ${state}`);

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating session:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sessions
 * List recent sessions
 */
router.get("/", (req, res) => {
  try {
    const sessions = sessionQueries.getAll.all();
    res.json(sessions);
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;




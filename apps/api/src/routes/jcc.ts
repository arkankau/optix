/**
 * JCC (Jackson Cross Cylinder) routes
 */

import { Router } from "express";
import {
  initJcc,
  nextJcc,
  isJccComplete,
  getJccResult,
  calculateJccConfidence,
} from "@OptiX/core";
import { grokHint } from "@OptiX/agent";

const router = Router();

/**
 * POST /api/jcc/init
 * Initialize JCC for one eye
 */
router.post("/init", (req, res) => {
  try {
    const { eye, startAxis } = req.body;

    if (!eye || !["OD", "OS"].includes(eye)) {
      return res.status(400).json({ error: "Invalid eye" });
    }

    const state = initJcc(eye, startAxis);

    console.log(`👁️  Initialized JCC for ${eye}`);

    res.json({
      success: true,
      state,
    });
  } catch (error: any) {
    console.error("JCC init error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/jcc/next
 * Advance JCC based on user choice (1 or 2)
 */
router.post("/next", async (req, res) => {
  try {
    const { state, choice, latencyMs } = req.body;

    if (!state || !choice || ![1, 2].includes(choice)) {
      return res.status(400).json({ error: "Missing state or invalid choice" });
    }

    const nextState = nextJcc(state, choice);
    const complete = isJccComplete(nextState);
    const confidence = calculateJccConfidence(nextState);

    let result = null;
    if (complete) {
      result = getJccResult(nextState);
      console.log(
        `👁️  JCC complete for ${state.eye}: cyl=${result.cyl}D @ ${result.axis}°`
      );
    }

    // Get Grok hint for optimization
    const recentChoices = nextState.history.slice(-3);
    const sameChoices = recentChoices.filter((h) => h.choice === choice).length;
    const grokSuggestion = await grokHint({
      misses: sameChoices < 2 ? 1 : 0, // Treat inconsistent choices as "misses"
      latencyMs: latencyMs || 2000,
      confidence,
      stage: "jcc",
      reversals: 0, // N/A for JCC
      trialCount: nextState.history.length,
    });

    res.json({
      success: true,
      state: nextState,
      complete,
      confidence,
      result,
      grokHint: grokSuggestion,
    });
  } catch (error: any) {
    console.error("JCC next error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


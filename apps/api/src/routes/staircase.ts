/**
 * Staircase algorithm routes
 */

import { Router } from "express";
import {
  initStaircase,
  nextStairState,
  isStaircaseComplete,
  calculateThreshold,
  calculateConfidence,
  logmarToSphere,
} from "@OptiX/core";
import { grokHint } from "@OptiX/agent";

const router = Router();

/**
 * POST /api/staircase/init
 * Initialize staircase for one eye
 */
router.post("/init", (req, res) => {
  try {
    const { eye, startIndex } = req.body;

    if (!eye || !["OD", "OS"].includes(eye)) {
      return res.status(400).json({ error: "Invalid eye" });
    }

    const state = initStaircase(eye, startIndex);

    console.log(`👁️  Initialized staircase for ${eye}`);

    res.json({
      success: true,
      state,
    });
  } catch (error: any) {
    console.error("Staircase init error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/staircase/next
 * Advance staircase based on response
 */
router.post("/next", async (req, res) => {
  try {
    const { state, wasCorrect, latencyMs } = req.body;

    if (!state || wasCorrect === undefined) {
      return res.status(400).json({ error: "Missing state or wasCorrect" });
    }

    const nextState = nextStairState(state, wasCorrect);
    const complete = isStaircaseComplete(nextState);
    const confidence = calculateConfidence(nextState);

    let threshold = null;
    let sphere = null;

    if (complete) {
      threshold = calculateThreshold(nextState);
      sphere = logmarToSphere(threshold);
      console.log(
        `👁️  Staircase complete for ${state.eye}: threshold=${threshold} logMAR, sphere=${sphere}D`
      );
    }

    // Get Grok hint for optimization
    const grokSuggestion = await grokHint({
      misses: nextState.history.filter((h) => !h.correct).length,
      latencyMs: latencyMs || 2000,
      confidence,
      stage: "sphere",
      reversals: nextState.reversals,
      trialCount: nextState.history.length,
    });

    res.json({
      success: true,
      state: nextState,
      complete,
      confidence,
      threshold,
      sphere,
      grokHint: grokSuggestion,
    });
  } catch (error: any) {
    console.error("Staircase next error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: get consecutive misses
 */
function getConsecutiveMisses(state: any): number {
  let count = 0;
  for (let i = state.history.length - 1; i >= 0; i--) {
    if (!state.history[i].correct) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Helper: get consecutive correct
 */
function getConsecutiveCorrect(state: any): number {
  let count = 0;
  for (let i = state.history.length - 1; i >= 0; i--) {
    if (state.history[i].correct) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

export default router;


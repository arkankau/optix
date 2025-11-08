/**
 * 1-up/2-down staircase algorithm for visual acuity threshold
 */

import { Eye } from "./types";

export interface StairState {
  eye: Eye;
  sizeIndex: number;          // index into logMAR steps
  reversals: number;
  direction: -1 | 1;          // -1 smaller (harder), +1 larger (easier)
  history: Array<{ idx: number; correct: boolean }>;
}

// Standard logMAR steps (1.0 = 20/200, 0.0 = 20/20, -0.1 = 20/16)
export const LOGMAR_STEPS = [
  1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0, -0.1, -0.2
];

/**
 * Initialize a new staircase for one eye
 */
export function initStaircase(eye: Eye, startIndex: number = 6): StairState {
  return {
    eye,
    sizeIndex: startIndex, // Start at 0.4 logMAR (~20/50)
    reversals: 0,
    direction: -1, // Start by making it harder
    history: [],
  };
}

/**
 * Advance staircase based on user response
 * 1-up/2-down: Two consecutive correct → smaller; one incorrect → larger
 */
export function nextStairState(
  state: StairState,
  wasCorrect: boolean
): StairState {
  const history = [...state.history, { idx: state.sizeIndex, correct: wasCorrect }];
  let dir = state.direction;

  // Determine new direction
  const lastTwo = history.slice(-2);
  if (!wasCorrect) {
    // One miss → go larger (easier)
    dir = 1;
  } else if (
    lastTwo.length === 2 &&
    lastTwo[0].correct &&
    lastTwo[1].correct
  ) {
    // Two consecutive correct → go smaller (harder)
    dir = -1;
  }

  // Calculate reversal
  const hadReversal = dir !== state.direction && state.history.length > 0;
  const reversals = hadReversal ? state.reversals + 1 : state.reversals;

  // Calculate next index
  const nextIdx = Math.max(
    0,
    Math.min(LOGMAR_STEPS.length - 1, state.sizeIndex + dir)
  );

  return {
    ...state,
    sizeIndex: nextIdx,
    direction: dir,
    reversals,
    history,
  };
}

/**
 * Check if staircase has reached stopping criterion
 */
export function isStaircaseComplete(state: StairState): boolean {
  return state.reversals >= 6;
}

/**
 * Calculate threshold from reversal points (last 4 reversals)
 */
export function calculateThreshold(state: StairState): number {
  if (state.reversals < 4) {
    return LOGMAR_STEPS[state.sizeIndex];
  }

  // Find last 4 reversal indices
  const reversalIndices: number[] = [];
  let prevDir = state.history[0]?.correct ? -1 : 1;

  for (let i = 1; i < state.history.length; i++) {
    const entry = state.history[i];
    const lastTwo = state.history.slice(Math.max(0, i - 1), i + 1);

    let dir = prevDir;
    if (!entry.correct) {
      dir = 1;
    } else if (lastTwo.length === 2 && lastTwo.every((e) => e.correct)) {
      dir = -1;
    }

    if (dir !== prevDir) {
      reversalIndices.push(entry.idx);
    }
    prevDir = dir;
  }

  // Average last 4 reversals
  const last4 = reversalIndices.slice(-4);
  const avgIdx = last4.reduce((sum, idx) => sum + idx, 0) / last4.length;
  const roundedIdx = Math.round(avgIdx);

  return LOGMAR_STEPS[roundedIdx] ?? LOGMAR_STEPS[state.sizeIndex];
}

/**
 * Convert logMAR threshold to estimated sphere correction
 * Rough empirical mapping for demo purposes
 */
export function logmarToSphere(logmar: number): number {
  // Very rough approximation:
  // 20/20 (0.0 logMAR) → 0.00 D
  // 20/40 (0.3 logMAR) → -0.50 D
  // 20/80 (0.6 logMAR) → -1.00 D
  
  if (logmar <= 0) {
    // Better than 20/20 → plano or slight plus
    return 0.0;
  }

  // Simplified linear approximation
  const diopters = -logmar * 1.5;
  
  // Round to nearest 0.25 D
  return Math.round(diopters / 0.25) * 0.25;
}

/**
 * Calculate confidence based on consistency of responses
 */
export function calculateConfidence(state: StairState): number {
  if (state.history.length < 6) return 0.5;

  // Look at last 6 trials
  const recent = state.history.slice(-6);
  
  // Count correct responses
  const correctCount = recent.filter((h) => h.correct).length;
  
  // Expected pattern: some correct, some wrong (convergence)
  // High confidence if we have 4-5 correct out of 6
  const ratio = correctCount / recent.length;
  
  // Map to confidence: best around 0.67-0.83 correct
  if (ratio >= 0.67 && ratio <= 0.83) {
    return 0.9;
  } else if (ratio >= 0.5 && ratio < 0.67) {
    return 0.75;
  } else if (ratio > 0.83) {
    return 0.8; // Too easy
  } else {
    return 0.6; // Struggling
  }
}



/**
 * Jackson Cross Cylinder algorithm for astigmatism refinement
 * Binary search over axis and cylinder power
 */

import { Eye } from "./types";

export type JccStage = "axis" | "power" | "done";

export interface JccState {
  eye: Eye;
  axisDeg: number;           // Current probe axis
  range: [number, number];   // Search bracket [0, 180)
  cyl: number;               // Current cylinder power (negative)
  stepDeg: number;           // Axis step size (15° → 10° → 5°)
  stage: JccStage;
  history: Array<{
    axis: number;
    choice: 1 | 2;
    cyl: number;
  }>;
}

/**
 * Initialize JCC search for one eye
 */
export function initJcc(eye: Eye, startAxis: number = 90): JccState {
  return {
    eye,
    axisDeg: startAxis,
    range: [0, 180],
    cyl: -0.5,          // Start with -0.50 D cylinder
    stepDeg: 15,        // Start with 15° steps
    stage: "axis",
    history: [],
  };
}

/**
 * Advance JCC based on user preference (1 or 2)
 * Choice 1 = first orientation, Choice 2 = second orientation
 */
export function nextJcc(state: JccState, userChoice: 1 | 2): JccState {
  const history = [
    ...state.history,
    { axis: state.axisDeg, choice: userChoice, cyl: state.cyl },
  ];

  let { axisDeg, stepDeg, stage, cyl } = state;

  if (stage === "axis") {
    // Refining axis direction
    // If choice 1 → rotate negative; if choice 2 → rotate positive
    const rotation = userChoice === 1 ? -stepDeg : stepDeg;
    axisDeg = (axisDeg + rotation + 180) % 180;

    // Check if we should reduce step size
    const recentChoices = history.slice(-3).map((h) => h.choice);
    const allSame = recentChoices.every((c) => c === recentChoices[0]);
    
    if (allSame && recentChoices.length >= 3) {
      // Consistent direction → reduce step
      if (stepDeg === 15) {
        stepDeg = 10;
      } else if (stepDeg === 10) {
        stepDeg = 5;
      } else {
        // Done with axis, move to power
        stage = "power";
      }
    }
  } else if (stage === "power") {
    // Refining cylinder power
    // Choice 1 = stronger (more negative), Choice 2 = weaker (less negative)
    if (userChoice === 1) {
      cyl = cyl - 0.25; // More negative
    } else {
      cyl = cyl + 0.25; // Less negative
    }

    // Stopping criteria for power
    const recentPowerChoices = history
      .slice(-3)
      .filter((h) => history.indexOf(h) >= history.length - 3)
      .map((h) => h.choice);

    const powerAllSame =
      recentPowerChoices.length === 3 &&
      recentPowerChoices.every((c) => c === recentPowerChoices[0]);

    // Stop if: too much cylinder, or consistent preference for 3+ trials, or reached 0
    if (Math.abs(cyl) >= 2.0 || powerAllSame || cyl >= 0) {
      stage = "done";
      // Clamp cylinder
      cyl = Math.max(-2.0, Math.min(0, cyl));
    }
  }

  return {
    ...state,
    axisDeg: Math.round(axisDeg) % 180,
    stepDeg,
    stage,
    cyl: Math.round(cyl * 4) / 4, // Round to 0.25
    history,
  };
}

/**
 * Check if JCC is complete
 */
export function isJccComplete(state: JccState): boolean {
  return state.stage === "done";
}

/**
 * Get final axis and cylinder from JCC state
 */
export function getJccResult(state: JccState): { axis: number; cyl: number } {
  return {
    axis: state.axisDeg,
    cyl: state.cyl,
  };
}

/**
 * Calculate confidence based on consistency
 */
export function calculateJccConfidence(state: JccState): number {
  if (state.history.length < 4) return 0.5;

  // Look for consistent patterns in recent history
  const recent = state.history.slice(-4);
  const choices = recent.map((h) => h.choice);

  // Count transitions
  let transitions = 0;
  for (let i = 1; i < choices.length; i++) {
    if (choices[i] !== choices[i - 1]) transitions++;
  }

  // Fewer transitions = higher confidence (converging)
  if (transitions === 0) return 0.9; // All same
  if (transitions === 1) return 0.8; // One switch
  if (transitions === 2) return 0.7; // Two switches
  return 0.6; // Unstable
}

/**
 * Generate flip angles for JCC presentation
 * Returns two axes to compare (±45° from current)
 */
export function getJccFlipAxes(state: JccState): [number, number] {
  const axis1 = (state.axisDeg - 45 + 180) % 180;
  const axis2 = (state.axisDeg + 45) % 180;
  return [axis1, axis2];
}




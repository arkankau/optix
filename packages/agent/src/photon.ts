/**
 * Photon hybrid fallback routing
 * Dynamically adjusts test difficulty based on performance
 */

export type RouteMode = "normal" | "easier" | "harder" | "abort";

export interface RoutingContext {
  confidence: number;
  fixationStable: boolean;
  latencyMs: number;
  consecutiveMisses: number;
  consecutiveCorrect: number;
  stage: string;
}

export interface RoutingDecision {
  mode: RouteMode;
  reason: string;
  adjustments: {
    difficultyDelta?: number;  // -1 easier, +1 harder
    showEncouragement?: boolean;
    skipTrial?: boolean;
  };
}

/**
 * Main Photon routing function
 * Decides whether to continue normally, ease up, or abort
 */
export function photonRoute(context: RoutingContext): RoutingDecision {
  const {
    confidence,
    fixationStable,
    latencyMs,
    consecutiveMisses,
    consecutiveCorrect,
  } = context;

  console.log(`⚡ Photon routing: conf=${confidence.toFixed(2)}, latency=${latencyMs}ms, misses=${consecutiveMisses}`);

  // ABORT conditions
  if (!fixationStable && consecutiveMisses >= 3) {
    return {
      mode: "abort",
      reason: "Unstable fixation with multiple misses",
      adjustments: {
        showEncouragement: true,
      },
    };
  }

  if (latencyMs > 8000 && confidence < 0.3) {
    return {
      mode: "abort",
      reason: "Very high latency with low confidence - patient may be fatigued",
      adjustments: {
        showEncouragement: true,
      },
    };
  }

  // EASIER conditions
  if (consecutiveMisses >= 3) {
    console.log("⚡ Photon: Switching to EASIER mode (3+ consecutive misses)");
    return {
      mode: "easier",
      reason: "Three consecutive misses - reducing difficulty",
      adjustments: {
        difficultyDelta: -1,
        showEncouragement: true,
      },
    };
  }

  if (confidence < 0.4 && latencyMs > 4000) {
    console.log("⚡ Photon: Switching to EASIER mode (low conf + high latency)");
    return {
      mode: "easier",
      reason: "Low confidence with slow responses",
      adjustments: {
        difficultyDelta: -1,
        showEncouragement: true,
      },
    };
  }

  if (!fixationStable) {
    return {
      mode: "easier",
      reason: "Fixation instability detected",
      adjustments: {
        difficultyDelta: -1,
      },
    };
  }

  // HARDER conditions
  if (consecutiveCorrect >= 5 && confidence > 0.9) {
    console.log("⚡ Photon: Switching to HARDER mode (5+ consecutive correct)");
    return {
      mode: "harder",
      reason: "Excellent performance - increasing challenge",
      adjustments: {
        difficultyDelta: 1,
      },
    };
  }

  // NORMAL
  console.log("⚡ Photon: Maintaining NORMAL mode");
  return {
    mode: "normal",
    reason: "Performance within expected range",
    adjustments: {},
  };
}

/**
 * Simplified routing (confidence + latency only)
 */
export function photonRouteSimple(
  confidence: number,
  fixationStable: boolean,
  latency: number
): RouteMode {
  if (!fixationStable || latency > 6000) {
    return "abort";
  }
  if (confidence < 0.4 || latency > 4000) {
    return "easier";
  }
  if (confidence > 0.9 && latency < 2000) {
    return "harder";
  }
  return "normal";
}

/**
 * Generate encouragement message based on routing
 */
export function getEncouragementMessage(mode: RouteMode): string {
  switch (mode) {
    case "easier":
      return "No problem! We'll slow down and show a larger line. Take your time.";
    case "harder":
      return "Excellent work! Let's make it a bit more challenging.";
    case "abort":
      return "Let's take a quick break. You're doing great!";
    default:
      return "Keep going, you're doing great!";
  }
}

/**
 * Check if route needs adjustment
 */
export function needsRouteAdjustment(
  currentMode: RouteMode,
  newDecision: RoutingDecision
): boolean {
  return currentMode !== newDecision.mode;
}



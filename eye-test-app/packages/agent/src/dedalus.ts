/**
 * Dedalus agent tool router
 * Decides which tool/action to invoke next
 */

export type Tool =
  | "tts"
  | "stt"
  | "staircase.init"
  | "staircase.next"
  | "jcc.init"
  | "jcc.next"
  | "calibrate"
  | "balance"
  | "summary";

export interface ToolContext {
  calibrated: boolean;
  stage: "idle" | "calibration" | "sphere_od" | "sphere_os" | "jcc_od" | "jcc_os" | "balance" | "complete";
  sphereOD?: {
    complete: boolean;
    reversals: number;
  };
  sphereOS?: {
    complete: boolean;
    reversals: number;
  };
  jccOD?: {
    complete: boolean;
    stage: string;
  };
  jccOS?: {
    complete: boolean;
    stage: string;
  };
  lastAction?: string;
  awaitingVoiceInput?: boolean;
}

export interface ToolDecision {
  tool: Tool;
  args: any;
  rationale: string;
  nextPrompt?: string;
}

/**
 * Main Dedalus router - decides next tool to invoke
 */
export function dedalusDecide(context: ToolContext): ToolDecision {
  console.log(`🎯 Dedalus routing: stage=${context.stage}, calibrated=${context.calibrated}`);

  // 1. Calibration phase
  if (!context.calibrated) {
    return {
      tool: "calibrate",
      args: {},
      rationale: "Need pixel calibration and viewing distance first",
      nextPrompt: "Let's start by calibrating your screen. Place a credit card on the screen.",
    };
  }

  // 2. Sphere testing - Right eye first
  if (context.stage === "calibration") {
    return {
      tool: "staircase.init",
      args: { eye: "OD" },
      rationale: "Calibration complete, start sphere test for right eye",
      nextPrompt: "Great! Now cover your left eye. Read the letters you see out loud.",
    };
  }

  if (context.stage === "sphere_od" && !context.sphereOD?.complete) {
    if (context.awaitingVoiceInput) {
      return {
        tool: "stt",
        args: {},
        rationale: "Awaiting voice input for letter reading",
      };
    }
    return {
      tool: "staircase.next",
      args: { eye: "OD" },
      rationale: "Continue staircase for right eye sphere",
      nextPrompt: "Read the next line.",
    };
  }

  // 3. Sphere testing - Left eye
  if (context.stage === "sphere_od" && context.sphereOD?.complete) {
    return {
      tool: "staircase.init",
      args: { eye: "OS" },
      rationale: "Right eye complete, start left eye sphere",
      nextPrompt: "Perfect! Now cover your right eye and read the letters with your left eye.",
    };
  }

  if (context.stage === "sphere_os" && !context.sphereOS?.complete) {
    if (context.awaitingVoiceInput) {
      return {
        tool: "stt",
        args: {},
        rationale: "Awaiting voice input for letter reading",
      };
    }
    return {
      tool: "staircase.next",
      args: { eye: "OS" },
      rationale: "Continue staircase for left eye sphere",
      nextPrompt: "Read the next line.",
    };
  }

  // 4. JCC astigmatism testing - Right eye
  if (context.stage === "sphere_os" && context.sphereOS?.complete) {
    return {
      tool: "jcc.init",
      args: { eye: "OD" },
      rationale: "Both sphere tests complete, start JCC for right eye",
      nextPrompt: "Now let's check for astigmatism. Cover your left eye again. Which is clearer: one... or two?",
    };
  }

  if (context.stage === "jcc_od" && !context.jccOD?.complete) {
    if (context.awaitingVoiceInput) {
      return {
        tool: "stt",
        args: {},
        rationale: "Awaiting voice choice (1 or 2)",
      };
    }
    return {
      tool: "jcc.next",
      args: { eye: "OD" },
      rationale: "Continue JCC axis/power refinement for right eye",
      nextPrompt: "Which is clearer: one... or two?",
    };
  }

  // 5. JCC astigmatism testing - Left eye
  if (context.stage === "jcc_od" && context.jccOD?.complete) {
    return {
      tool: "jcc.init",
      args: { eye: "OS" },
      rationale: "Right eye JCC complete, start left eye",
      nextPrompt: "Great! Now cover your right eye. Which is clearer: one... or two?",
    };
  }

  if (context.stage === "jcc_os" && !context.jccOS?.complete) {
    if (context.awaitingVoiceInput) {
      return {
        tool: "stt",
        args: {},
        rationale: "Awaiting voice choice (1 or 2)",
      };
    }
    return {
      tool: "jcc.next",
      args: { eye: "OS" },
      rationale: "Continue JCC axis/power refinement for left eye",
      nextPrompt: "Which is clearer: one... or two?",
    };
  }

  // 6. Binocular balance (optional - can skip for MVP)
  if (context.stage === "jcc_os" && context.jccOS?.complete) {
    return {
      tool: "summary",
      args: {},
      rationale: "All tests complete, generate final Rx",
      nextPrompt: "Excellent work! We're all done. Let me calculate your prescription.",
    };
  }

  // 7. Summary/Complete
  if (context.stage === "balance" || context.stage === "complete") {
    return {
      tool: "summary",
      args: {},
      rationale: "Generate final prescription summary",
      nextPrompt: "Here's your prescription!",
    };
  }

  // Default fallback
  return {
    tool: "summary",
    args: {},
    rationale: "Unknown state, generating summary",
    nextPrompt: "Let's see your results.",
  };
}

/**
 * Validate tool can be invoked in current context
 */
export function canInvokeTool(tool: Tool, context: ToolContext): boolean {
  switch (tool) {
    case "calibrate":
      return !context.calibrated;
    case "staircase.init":
    case "staircase.next":
      return context.calibrated && context.stage.startsWith("sphere");
    case "jcc.init":
    case "jcc.next":
      return context.calibrated && context.stage.startsWith("jcc");
    case "summary":
      return context.stage === "complete" || context.stage === "balance";
    default:
      return true;
  }
}

/**
 * Get next stage after tool completion
 */
export function getNextStage(currentStage: ToolContext["stage"], completedTool: Tool): ToolContext["stage"] {
  if (completedTool === "calibrate") return "sphere_od";
  
  if (completedTool === "staircase.next") {
    if (currentStage === "sphere_od") return "sphere_os";
    if (currentStage === "sphere_os") return "jcc_od";
  }
  
  if (completedTool === "jcc.next") {
    if (currentStage === "jcc_od") return "jcc_os";
    if (currentStage === "jcc_os") return "complete";
  }
  
  return currentStage;
}




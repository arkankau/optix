/**
 * xAI Grok integration for realtime policy adjustment
 */

import fetch from "node-fetch";

export interface LiveSignals {
  misses: number;
  latencyMs: number;
  confidence: number;
  stage: "sphere" | "jcc" | "balance";
  reversals: number;
  trialCount: number;
}

export interface GrokHint {
  suggestion: string;
  reason: string;
  priority: "low" | "medium" | "high";
  adjustments?: {
    stepSize?: number;
    repeatLine?: boolean;
    switchMode?: string;
  };
}

/**
 * Call xAI Grok for realtime test optimization hints
 */
export async function grokHint(signals: LiveSignals): Promise<GrokHint> {
  const apiKey = process.env.XAI_GROK_API_KEY;

  if (!apiKey) {
    console.warn("⚠️  XAI_GROK_API_KEY not set, using rule-based fallback");
    return grokFallback(signals);
  }

  try {
    console.log(`🤖 Grok analyzing live signals: conf=${signals.confidence.toFixed(2)}, misses=${signals.misses}`);

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-beta",
        messages: [
          {
            role: "system",
            content: `You are an expert optometry AI analyzing a live vision test. 
Provide concise, actionable recommendations to optimize test accuracy and patient experience.
Focus on: step size adjustment, difficulty adaptation, and stopping criteria.`,
          },
          {
            role: "user",
            content: `Current test state:
- Stage: ${signals.stage}
- Confidence: ${signals.confidence.toFixed(2)}
- Recent misses: ${signals.misses}
- Avg latency: ${signals.latencyMs}ms
- Reversals: ${signals.reversals}
- Total trials: ${signals.trialCount}

Recommend ONE specific adjustment. Be concise.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse response
    const hint = parseGrokResponse(content, signals);
    
    console.log(`🤖 Grok suggestion: ${hint.suggestion} (${hint.reason})`);

    return hint;
  } catch (error) {
    console.error("Grok API error:", error);
    return grokFallback(signals);
  }
}

/**
 * Parse Grok's natural language response into structured hint
 */
function parseGrokResponse(content: string, signals: LiveSignals): GrokHint {
  const lower = content.toLowerCase();

  // Detect suggestions
  let suggestion = "Continue current protocol";
  let adjustments: any = {};

  if (lower.includes("reduce step") || lower.includes("smaller step")) {
    suggestion = signals.stage === "sphere" 
      ? "Reduce letter size step for finer convergence"
      : "Reduce axis step to 5° for precision";
    adjustments.stepSize = signals.stage === "jcc" ? 5 : undefined;
  } else if (lower.includes("easier") || lower.includes("larger")) {
    suggestion = "Increase difficulty step - patient struggling";
    adjustments.repeatLine = true;
  } else if (lower.includes("stop") || lower.includes("complete")) {
    suggestion = "Sufficient data collected, ready to advance";
  } else if (lower.includes("repeat") || lower.includes("verify")) {
    suggestion = "Repeat last trial for verification";
    adjustments.repeatLine = true;
  }

  const priority: "low" | "medium" | "high" = 
    signals.confidence < 0.5 ? "high" :
    signals.confidence < 0.7 ? "medium" : "low";

  return {
    suggestion,
    reason: content.substring(0, 100),
    priority,
    adjustments,
  };
}

/**
 * Rule-based fallback when Grok API unavailable
 */
function grokFallback(signals: LiveSignals): GrokHint {
  const { confidence, misses, latencyMs, stage, reversals } = signals;

  // High misses or low confidence
  if (misses >= 3 || confidence < 0.5) {
    return {
      suggestion: "Confidence dipped, allocate more trials or ease difficulty",
      reason: `${misses} misses with ${(confidence * 100).toFixed(0)}% confidence`,
      priority: "high",
      adjustments: {
        repeatLine: true,
      },
    };
  }

  // Slow responses
  if (latencyMs > 3000) {
    return {
      suggestion: "High latency detected, patient may need encouragement",
      reason: `Average response time ${latencyMs}ms`,
      priority: "medium",
    };
  }

  // Stage-specific advice
  if (stage === "sphere" && reversals >= 6) {
    return {
      suggestion: "Staircase converged, ready for JCC astigmatism test",
      reason: `${reversals} reversals achieved`,
      priority: "low",
    };
  }

  if (stage === "jcc" && confidence > 0.8) {
    return {
      suggestion: "Axis search stable, tighten step to 5°",
      reason: `High confidence (${(confidence * 100).toFixed(0)}%)`,
      priority: "low",
      adjustments: {
        stepSize: 5,
      },
    };
  }

  return {
    suggestion: "Continue current protocol",
    reason: "Test progressing normally",
    priority: "low",
  };
}

/**
 * Monitor test and trigger alerts
 */
export function shouldAlert(signals: LiveSignals): boolean {
  return (
    signals.confidence < 0.4 ||
    signals.misses >= 4 ||
    signals.latencyMs > 5000
  );
}




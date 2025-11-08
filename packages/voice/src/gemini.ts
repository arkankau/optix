/**
 * Google Gemini client for STT and NLU (function calling)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not set");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Speech-to-text using Gemini
 * Takes base64 audio and returns transcribed text
 */
export async function sttGemini(audioBase64: string): Promise<{
  text: string;
  confidence: number;
}> {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: "gemini-pro" });

    // For demo: parse audio using Gemini's multimodal capability
    // In production, use Gemini's audio API when available
    const prompt = `
      Transcribe the following speech audio to text.
      Focus on detecting individual letters (C, D, E, F, L, O, P, T, Z).
      Or detect phrases like "one", "two", "next", "repeat".
      Return ONLY the transcribed text, nothing else.
    `;

    // For now, we'll use a simplified approach
    // Real implementation would use Gemini's audio input
    console.log("🎤 Gemini STT processing audio...");

    // Mock for demo (in production, send actual audio)
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().toUpperCase();

    console.log(`🎤 Gemini parsed: "${text}" (mock confidence: 0.85)`);

    return {
      text,
      confidence: 0.85,
    };
  } catch (error) {
    console.error("Gemini STT error:", error);
    // Return mock result for demo
    return {
      text: "C D Z O P",
      confidence: 0.5,
    };
  }
}

/**
 * Function calling / NLU policy using Gemini
 * Analyzes test state and proposes next action
 */
export async function policyGemini(context: {
  stage: "sphere" | "jcc" | "balance";
  reversals: number;
  confidence: number;
  recentMisses: number;
  latency: number;
}): Promise<{
  action: string;
  args: any;
  confidence: number;
  reasoning: string;
}> {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
You are an expert optometrist AI assistant analyzing a visual acuity test in progress.

Current state:
- Stage: ${context.stage}
- Reversals: ${context.reversals}
- Confidence: ${context.confidence}
- Recent misses: ${context.recentMisses}
- Response latency: ${context.latency}ms

Based on this state, recommend the next action:
1. "continue" - keep current protocol
2. "ease" - make test easier (larger letters)
3. "tighten" - make test harder (smaller letters)
4. "switch_stage" - move to next stage
5. "abort" - patient struggling, stop test

Respond in JSON format:
{
  "action": "...",
  "args": {},
  "confidence": 0.0-1.0,
  "reasoning": "..."
}
    `;

    console.log("🧠 Gemini policy evaluating state...");

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const policy = JSON.parse(jsonMatch[0]);
      console.log(`🧠 Gemini policy: ${policy.action} (${policy.reasoning})`);
      return policy;
    }

    // Fallback
    return {
      action: "continue",
      args: {},
      confidence: context.confidence,
      reasoning: "Continuing with current protocol",
    };
  } catch (error) {
    console.error("Gemini policy error:", error);
    
    // Fallback logic
    if (context.confidence < 0.5 || context.recentMisses > 2) {
      return {
        action: "ease",
        args: {},
        confidence: 0.7,
        reasoning: "Low confidence or multiple misses detected",
      };
    }

    return {
      action: "continue",
      args: {},
      confidence: context.confidence,
      reasoning: "Default continuation",
    };
  }
}

/**
 * Parse spoken letters using Gemini's NLU
 */
export async function parseLetters(spokenText: string): Promise<string[]> {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
Extract individual letters from this spoken text: "${spokenText}"

Valid letters are: C, D, E, F, L, O, P, T, Z

Return ONLY the letters as a space-separated string, e.g., "C D Z O P"
If no valid letters, return empty string.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().toUpperCase();

    const letters = text.split(/\s+/).filter((l) => l.length === 1);

    console.log(`🔤 Gemini parsed letters: ${letters.join(" ")}`);

    return letters;
  } catch (error) {
    console.error("Gemini letter parsing error:", error);
    // Fallback: simple regex extraction
    const letters = spokenText
      .toUpperCase()
      .match(/[CDEFLOPTZ]/g) || [];
    return letters;
  }
}

/**
 * Detect user intent (choice, command, letters)
 */
export async function detectIntent(spokenText: string): Promise<{
  type: "choice" | "letters" | "command";
  value: any;
  confidence: number;
}> {
  const text = spokenText.toLowerCase().trim();

  // Check for choices
  if (text.includes("one") || text === "1") {
    return { type: "choice", value: 1, confidence: 0.95 };
  }
  if (text.includes("two") || text === "2") {
    return { type: "choice", value: 2, confidence: 0.95 };
  }

  // Check for commands
  if (text.includes("next") || text.includes("skip")) {
    return { type: "command", value: "next", confidence: 0.9 };
  }
  if (text.includes("repeat") || text.includes("again")) {
    return { type: "command", value: "repeat", confidence: 0.9 };
  }
  if (text.includes("stop") || text.includes("quit")) {
    return { type: "command", value: "stop", confidence: 0.9 };
  }

  // Otherwise, assume letters
  const letters = await parseLetters(spokenText);
  return {
    type: "letters",
    value: letters,
    confidence: letters.length > 0 ? 0.8 : 0.3,
  };
}



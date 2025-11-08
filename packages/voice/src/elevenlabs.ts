/**
 * ElevenLabs TTS client
 */

import fetch from "node-fetch";

export interface TTSOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  modelId?: string;
}

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice
const DEFAULT_MODEL = "eleven_monolingual_v1";

/**
 * Convert text to speech using ElevenLabs
 */
export async function ttsSpeak(
  text: string,
  options: TTSOptions = {}
): Promise<ArrayBuffer> {
  const {
    voiceId = DEFAULT_VOICE_ID,
    stability = 0.5,
    similarityBoost = 0.75,
    modelId = DEFAULT_MODEL,
  } = options;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.warn("⚠️  ELEVENLABS_API_KEY not set, using mock TTS");
    return createMockAudio(text);
  }

  console.log(`🔊 Using ElevenLabs for prompt: "${text}"`);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS failed: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    return buffer.buffer as ArrayBuffer;
  } catch (error) {
    console.error("ElevenLabs TTS error:", error);
    // Fallback to mock
    return createMockAudio(text);
  }
}

/**
 * Get available voices from ElevenLabs
 */
export async function getVoices(): Promise<any[]> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return [];
  }

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error("Error fetching voices:", error);
    return [];
  }
}

/**
 * Create mock audio buffer for demo/testing
 */
function createMockAudio(text: string): ArrayBuffer {
  // Create a minimal valid MP3 header + silent audio
  // This is just for demo purposes when API key is not available
  const mockData = new Uint8Array(1024);
  mockData.fill(0);
  
  // Add ID3 tag
  mockData[0] = 0x49; // 'I'
  mockData[1] = 0x44; // 'D'
  mockData[2] = 0x33; // '3'
  
  console.log(`🔇 Mock TTS: "${text}"`);
  
  return mockData.buffer;
}

/**
 * Stream TTS for longer texts (chunks)
 */
export async function ttsStream(
  text: string,
  onChunk: (chunk: ArrayBuffer) => void,
  options: TTSOptions = {}
): Promise<void> {
  const {
    voiceId = DEFAULT_VOICE_ID,
    stability = 0.5,
    similarityBoost = 0.75,
    modelId = DEFAULT_MODEL,
  } = options;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.warn("⚠️  ELEVENLABS_API_KEY not set, using mock TTS");
    onChunk(createMockAudio(text));
    return;
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS stream failed: ${response.statusText}`);
    }

    // Stream chunks
    const reader = response.body;
    if (!reader) {
      throw new Error("No response body");
    }

    for await (const chunk of reader) {
      const buffer = Buffer.isBuffer(chunk) ? chunk.buffer as ArrayBuffer : chunk as any;
      onChunk(buffer);
    }
  } catch (error) {
    console.error("ElevenLabs TTS stream error:", error);
    onChunk(createMockAudio(text));
  }
}


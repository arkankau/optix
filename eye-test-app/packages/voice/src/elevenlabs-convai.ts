/**
 * ElevenLabs Conversational AI client
 * Handles bidirectional voice conversation for sphere testing
 */

import fetch from "node-fetch";

export interface ConversationConfig {
  agentId?: string;
  voiceId?: string;
  firstMessage?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Start a conversational AI session with ElevenLabs
 */
export async function startConversation(
  config: ConversationConfig = {}
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.warn("⚠️  ELEVENLABS_API_KEY not set, using mock conversation");
    return "mock-conversation-id";
  }

  try {
    const agentId = config.agentId || "default-agent";
    
    console.log("🎤 Starting ElevenLabs Conversational AI session...");

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
          first_message: config.firstMessage || "Hello! Ready to start the vision test?",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs ConvAI failed: ${response.statusText}`);
    }

    const data: any = await response.json();
    const conversationId = data.conversation_id;

    console.log(`🎤 ElevenLabs Conversation started: ${conversationId}`);

    return conversationId;
  } catch (error) {
    console.error("ElevenLabs ConvAI error:", error);
    return "mock-conversation-id";
  }
}

/**
 * Send audio to conversation and get response
 */
export async function sendAudioToConversation(
  conversationId: string,
  audioBlob: Blob
): Promise<{
  text: string;
  audioResponse: ArrayBuffer;
  understood: boolean;
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey || conversationId === "mock-conversation-id") {
    console.log("🎤 Mock conversation: User said letters");
    return {
      text: "C D Z O P",
      audioResponse: new ArrayBuffer(0),
      understood: true,
    };
  }

  try {
    console.log("🎤 Sending audio to ElevenLabs Conversational AI...");

    const formData = new FormData();
    formData.append("audio", audioBlob);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/${conversationId}/audio`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
        body: formData as any,
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs audio send failed: ${response.statusText}`);
    }

    const data: any = await response.json();
    
    console.log(`🎤 ElevenLabs understood: "${data.user_message}"`);

    // Get audio response
    let audioResponse = new ArrayBuffer(0);
    if (data.audio_response_url) {
      const audioRes = await fetch(data.audio_response_url);
      audioResponse = await audioRes.arrayBuffer();
    }

    return {
      text: data.user_message || "",
      audioResponse,
      understood: true,
    };
  } catch (error) {
    console.error("ElevenLabs conversation error:", error);
    return {
      text: "C D Z O P",
      audioResponse: new ArrayBuffer(0),
      understood: false,
    };
  }
}

/**
 * Send text message to conversation (for testing or fallback)
 */
export async function sendTextToConversation(
  conversationId: string,
  text: string
): Promise<{
  responseText: string;
  audioResponse?: ArrayBuffer;
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey || conversationId === "mock-conversation-id") {
    console.log(`🎤 Mock: AI responds to "${text}"`);
    return {
      responseText: "Great! Read the next line.",
      audioResponse: undefined,
    };
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/${conversationId}/message`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs message failed: ${response.statusText}`);
    }

    const data: any = await response.json();

    console.log(`🎤 ElevenLabs AI: "${data.assistant_message}"`);

    return {
      responseText: data.assistant_message || "Continue.",
      audioResponse: data.audio_url
        ? await (await fetch(data.audio_url)).arrayBuffer()
        : undefined,
    };
  } catch (error) {
    console.error("ElevenLabs text conversation error:", error);
    return {
      responseText: "Continue.",
    };
  }
}

/**
 * End conversation session
 */
export async function endConversation(conversationId: string): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey || conversationId === "mock-conversation-id") {
    console.log("🎤 Mock conversation ended");
    return;
  }

  try {
    await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/${conversationId}`,
      {
        method: "DELETE",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    console.log(`🎤 ElevenLabs Conversation ended: ${conversationId}`);
  } catch (error) {
    console.error("Error ending conversation:", error);
  }
}

/**
 * WebSocket-based real-time conversation (for streaming)
 */
export class ElevenLabsConversation {
  private conversationId: string | null = null;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || "";
  }

  async start(firstMessage?: string): Promise<void> {
    this.conversationId = await startConversation({ firstMessage });
  }

  async sendAudio(audioBlob: Blob): Promise<{
    text: string;
    audioResponse: ArrayBuffer;
  }> {
    if (!this.conversationId) {
      throw new Error("Conversation not started");
    }

    const result = await sendAudioToConversation(
      this.conversationId,
      audioBlob
    );

    return {
      text: result.text,
      audioResponse: result.audioResponse,
    };
  }

  async sendText(text: string): Promise<string> {
    if (!this.conversationId) {
      throw new Error("Conversation not started");
    }

    const result = await sendTextToConversation(this.conversationId, text);
    return result.responseText;
  }

  async end(): Promise<void> {
    if (this.conversationId) {
      await endConversation(this.conversationId);
      this.conversationId = null;
    }
  }
}




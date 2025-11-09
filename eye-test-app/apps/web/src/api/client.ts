/**
 * API client for backend communication
 */

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8787';

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Session
  async createSession(data: any) {
    return this.request<any>('/api/session', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSession(id: string) {
    return this.request<any>(`/api/session/${id}`);
  }

  async updateSession(id: string, data: any) {
    return this.request<any>(`/api/session/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Events
  async logEvent(event: any) {
    return this.request<any>('/api/event', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  // Voice
  async tts(text: string, voiceId?: string): Promise<ArrayBuffer> {
    const response = await fetch(`${this.baseURL}/api/voice/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, voiceId }),
    });

    if (!response.ok) {
      throw new Error('TTS failed');
    }

    return response.arrayBuffer();
  }

  async stt(audioBlob: Blob) {
    const formData = new FormData();
    formData.append('audio', audioBlob);

    const response = await fetch(`${this.baseURL}/api/voice/stt`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('STT failed');
    }

    return response.json();
  }

  async detectIntent(text: string) {
    return this.request<any>('/api/voice/intent', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Staircase
  async initStaircase(eye: string, startIndex?: number) {
    return this.request<any>('/api/staircase/init', {
      method: 'POST',
      body: JSON.stringify({ eye, startIndex }),
    });
  }

  async nextStaircase(state: any, wasCorrect: boolean, latencyMs: number) {
    return this.request<any>('/api/staircase/next', {
      method: 'POST',
      body: JSON.stringify({ state, wasCorrect, latencyMs }),
    });
  }

  // JCC
  async initJCC(eye: string, startAxis?: number) {
    return this.request<any>('/api/jcc/init', {
      method: 'POST',
      body: JSON.stringify({ eye, startAxis }),
    });
  }

  async nextJCC(state: any, choice: 1 | 2, latencyMs: number) {
    return this.request<any>('/api/jcc/next', {
      method: 'POST',
      body: JSON.stringify({ state, choice, latencyMs }),
    });
  }

  // Summary
  async saveSummary(sessionId: string, results: any) {
    return this.request<any>('/api/summary', {
      method: 'POST',
      body: JSON.stringify({ sessionId, results }),
    });
  }

  async getSummary(sessionId: string) {
    return this.request<any>(`/api/summary/${sessionId}`);
  }

  async exportCSV(sessionId: string): Promise<string> {
    const response = await fetch(`${this.baseURL}/api/summary/${sessionId}/export`);
    return response.text();
  }

  // Conversational AI
  async startConversation(sessionId: string, eye: string, firstMessage?: string) {
    return this.request<any>('/api/conversation/start', {
      method: 'POST',
      body: JSON.stringify({ sessionId, eye, firstMessage }),
    });
  }

  async sendConversationAudio(sessionId: string, eye: string, audioBlob: Blob) {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('sessionId', sessionId);
    formData.append('eye', eye);

    const response = await fetch(`${this.baseURL}/api/conversation/audio`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Conversation audio failed');
    }

    return response.json();
  }

  async sendConversationMessage(sessionId: string, eye: string, message: string) {
    return this.request<any>('/api/conversation/message', {
      method: 'POST',
      body: JSON.stringify({ sessionId, eye, message }),
    });
  }

  async endConversation(sessionId: string, eye: string) {
    return this.request<any>('/api/conversation/end', {
      method: 'POST',
      body: JSON.stringify({ sessionId, eye }),
    });
  }

  // Agent - xAI Analysis
  async analyzeResponse(data: {
    patientSpeech: string;
    expectedLetters: string;
    currentLine: number;
    eye: string;
    stage: string;
    previousPerformance?: Array<{ line: number; correct: boolean }>;
  }) {
    return this.request<any>('/api/agent/analyze-response', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new APIClient(API_BASE);


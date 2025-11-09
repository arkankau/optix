/**
 * Simple Conversation Flow
 * ElevenLabs TTS + Web Speech API STT + xAI Brain
 * 
 * Clean, predictable, and actually works!
 */

import { api } from '../api/client';

interface ConversationCallbacks {
  onAgentSpeaking: (speaking: boolean) => void;
  onListening: (listening: boolean) => void;
  onMessage: (message: { type: 'user' | 'agent'; text: string }) => void;
  onError: (error: any) => void;
}

export class SimpleConversationFlow {
  private recognition: SpeechRecognition | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private callbacks: ConversationCallbacks;
  private isAgentSpeaking = false;
  private isListening = false;

  constructor(callbacks: ConversationCallbacks) {
    this.callbacks = callbacks;
    this.initSpeechRecognition();
  }

  private initSpeechRecognition() {
    // @ts-ignore - Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('❌ Web Speech API not supported');
      this.callbacks.onError(new Error('Speech recognition not supported'));
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript;
      const confidence = event.results[last][0].confidence;
      
      console.log(`✅ User said: "${transcript}" (${(confidence * 100).toFixed(0)}% confidence)`);
      
      this.callbacks.onMessage({
        type: 'user',
        text: transcript
      });
      
      this.stopListening();
    };

    this.recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      this.callbacks.onError(event.error);
      this.stopListening();
    };

    this.recognition.onend = () => {
      this.stopListening();
    };

    console.log('✅ Speech recognition initialized');
  }

  /**
   * Agent speaks using ElevenLabs TTS
   */
  async speak(text: string): Promise<void> {
    console.log(`🗣️ Agent speaking: "${text}"`);
    
    this.isAgentSpeaking = true;
    this.callbacks.onAgentSpeaking(true);
    
    // Add to message history
    this.callbacks.onMessage({
      type: 'agent',
      text: text
    });

    try {
      // Call ElevenLabs TTS endpoint
      const response = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          voiceId: 'EXAVITQu4vr4xnSDxMaL' // Default ElevenLabs voice
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play audio
      this.currentAudio = new Audio(audioUrl);
      
      await new Promise<void>((resolve, reject) => {
        if (!this.currentAudio) return reject(new Error('No audio'));
        
        this.currentAudio.onended = () => {
          console.log('✅ Agent finished speaking');
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          this.isAgentSpeaking = false;
          this.callbacks.onAgentSpeaking(false);
          resolve();
        };
        
        this.currentAudio.onerror = (e) => {
          console.error('❌ Audio playback error:', e);
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          this.isAgentSpeaking = false;
          this.callbacks.onAgentSpeaking(false);
          reject(e);
        };
        
        this.currentAudio.play().catch(reject);
      });
      
      // Auto-start listening after speaking
      await this.listen();
      
    } catch (error) {
      console.error('❌ Speak error:', error);
      this.isAgentSpeaking = false;
      this.callbacks.onAgentSpeaking(false);
      this.callbacks.onError(error);
    }
  }

  /**
   * Listen for user speech
   */
  async listen(): Promise<void> {
    if (!this.recognition || this.isListening) return;

    console.log('👂 Listening for user...');
    this.isListening = true;
    this.callbacks.onListening(true);

    try {
      this.recognition.start();
    } catch (error) {
      console.error('❌ Listen error:', error);
      this.isListening = false;
      this.callbacks.onListening(false);
      this.callbacks.onError(error);
    }
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Already stopped
      }
    }
    this.isListening = false;
    this.callbacks.onListening(false);
  }

  /**
   * Stop agent speech
   */
  stopSpeaking(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.isAgentSpeaking = false;
    this.callbacks.onAgentSpeaking(false);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopListening();
    this.stopSpeaking();
    this.recognition = null;
  }
}


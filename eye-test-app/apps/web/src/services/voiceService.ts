/**
 * Voice Service - xAI-Controlled Conversation
 * 
 * Uses:
 * - Web Speech API for STT (Speech-to-Text)
 * - ElevenLabs REST API for TTS (Text-to-Speech)
 * 
 * Design: Fully conversational with NO BUTTON INPUT
 * - Agent speaks → Auto-starts listening
 * - User speaks → Auto-captured
 * - xAI analyzes → Agent responds
 * - Loop continues automatically
 */

interface VoiceServiceCallbacks {
  onUserSpeech?: (text: string, confidence: number) => void;
  onAgentSpeaking?: (speaking: boolean) => void;
  onListening?: (listening: boolean) => void;
  onError?: (error: any) => void;
}

export class VoiceService {
  private recognition: any = null;
  private currentAudio: HTMLAudioElement | null = null;
  private isListeningInternal = false;
  private isSpeakingInternal = false;
  private callbacks: VoiceServiceCallbacks = {};
  private destroyed = false;

  constructor(callbacks: VoiceServiceCallbacks = {}) {
    this.callbacks = callbacks;
    console.log('🎤 VoiceService: Initializing...');
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    // @ts-ignore - Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('❌ VoiceService: Web Speech API not supported in this browser');
      this.callbacks.onError?.('Web Speech API not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false; // One utterance at a time
    this.recognition.interimResults = false; // Only final results
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      console.log('👂 VoiceService: Listening started');
      this.isListeningInternal = true;
      this.callbacks.onListening?.(true);
    };

    this.recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript.trim();
      const confidence = event.results[last][0].confidence;
      
      console.log(`✅ VoiceService: Captured speech: "${transcript}" (${(confidence * 100).toFixed(0)}% confidence)`);
      this.callbacks.onUserSpeech?.(transcript, confidence);
    };

    this.recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        console.log('⚠️ VoiceService: No speech detected, will retry...');
      } else {
        console.error('❌ VoiceService: Speech recognition error:', event.error);
        this.callbacks.onError?.(event.error);
      }
    };

    this.recognition.onend = () => {
      console.log('🛑 VoiceService: Listening ended');
      this.isListeningInternal = false;
      this.callbacks.onListening?.(false);
    };

    console.log('✅ VoiceService: Speech recognition initialized');
  }

  /**
   * Start listening for user speech
   * Called automatically after agent finishes speaking
   */
  startListening() {
    if (this.destroyed) {
      console.warn('⚠️ VoiceService: Cannot start listening - service destroyed');
      return;
    }

    if (!this.recognition) {
      console.error('❌ VoiceService: Speech recognition not available');
      return;
    }

    if (this.isListeningInternal) {
      console.log('⚠️ VoiceService: Already listening');
      return;
    }

    if (this.isSpeakingInternal) {
      console.log('⚠️ VoiceService: Cannot listen while agent is speaking');
      return;
    }

    try {
      console.log('🎤 VoiceService: Starting to listen...');
      this.recognition.start();
    } catch (error: any) {
      // If already started, ignore
      if (error.message?.includes('already started')) {
        console.log('⚠️ VoiceService: Recognition already started');
      } else {
        console.error('❌ VoiceService: Error starting recognition:', error);
        this.callbacks.onError?.(error);
      }
    }
  }

  /**
   * Stop listening
   */
  stopListening() {
    if (this.recognition && this.isListeningInternal) {
      try {
        this.recognition.stop();
        console.log('🛑 VoiceService: Stopped listening');
      } catch (e) {
        console.warn('⚠️ VoiceService: Recognition already stopped');
      }
    }
  }

  /**
   * Speak text using ElevenLabs TTS
   * Automatically starts listening after speech completes
   */
  async speak(text: string): Promise<void> {
    if (this.destroyed) {
      console.warn('⚠️ VoiceService: Cannot speak - service destroyed');
      return;
    }

    // Stop any current speech
    if (this.isSpeakingInternal) {
      console.log('⚠️ VoiceService: Stopping current speech to start new one');
      this.stopSpeaking();
    }

    // Stop listening while speaking
    if (this.isListeningInternal) {
      this.stopListening();
    }

    try {
      console.log(`🗣️ VoiceService: Agent speaking: "${text}"`);
      this.isSpeakingInternal = true;
      this.callbacks.onAgentSpeaking?.(true);

      // Get audio from ElevenLabs TTS
      console.log('📡 VoiceService: Fetching TTS audio from backend...');
      const response = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          voiceId: 'EXAVITQu4vr4xnSDxMaL' // Rachel - professional female voice
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS API failed (${response.status}): ${errorText}`);
      }

      const audioBlob = await response.blob();
      console.log(`✅ VoiceService: Got audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
      
      if (audioBlob.size < 1000) {
        console.warn('⚠️ VoiceService: Audio blob suspiciously small, might be mock audio');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      this.currentAudio = new Audio(audioUrl);
      
      // Set up event handlers BEFORE playing
      this.currentAudio.onended = () => {
        console.log('✅ VoiceService: Speech playback complete');
        this.isSpeakingInternal = false;
        this.callbacks.onAgentSpeaking?.(false);
        URL.revokeObjectURL(audioUrl);
        
        // 🎯 AUTO-START listening after agent speaks (no button needed!)
        console.log('🔄 VoiceService: Auto-starting listening in 500ms...');
        setTimeout(() => {
          if (!this.destroyed && !this.isSpeakingInternal) {
            this.startListening();
          }
        }, 500);
      };
      
      this.currentAudio.onerror = (e) => {
        console.error('❌ VoiceService: Audio playback error:', e);
        console.error('   Audio URL:', audioUrl);
        console.error('   Audio type:', audioBlob.type);
        this.isSpeakingInternal = false;
        this.callbacks.onAgentSpeaking?.(false);
        URL.revokeObjectURL(audioUrl);
        this.callbacks.onError?.(e);
        
        // Still try to start listening even after error
        setTimeout(() => {
          if (!this.destroyed && !this.isSpeakingInternal) {
            this.startListening();
          }
        }, 500);
      };

      this.currentAudio.oncanplaythrough = () => {
        console.log('✅ VoiceService: Audio ready to play');
      };
      
      // Start playing
      console.log('▶️ VoiceService: Starting audio playback...');
      await this.currentAudio.play();
      console.log('🔊 VoiceService: Audio playing...');
      
    } catch (error) {
      console.error('❌ VoiceService: Speak error:', error);
      this.isSpeakingInternal = false;
      this.callbacks.onAgentSpeaking?.(false);
      this.callbacks.onError?.(error);
      
      // Try to recover by starting listening
      setTimeout(() => {
        if (!this.destroyed && !this.isSpeakingInternal) {
          this.startListening();
        }
      }, 500);
      
      throw error;
    }
  }

  /**
   * Stop current speech
   */
  stopSpeaking() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.isSpeakingInternal = false;
    this.callbacks.onAgentSpeaking?.(false);
  }

  /**
   * Check if currently speaking
   */
  get isSpeaking() {
    return this.isSpeakingInternal;
  }

  /**
   * Check if currently listening
   */
  get isListening() {
    return this.isListeningInternal;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    console.log('🗑️ VoiceService: Destroying...');
    this.destroyed = true;
    this.stopListening();
    this.stopSpeaking();
    this.recognition = null;
    console.log('✅ VoiceService: Destroyed');
  }
}


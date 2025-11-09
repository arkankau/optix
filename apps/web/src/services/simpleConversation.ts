/**
 * Simple Turn-Based Conversation with ElevenLabs
 * No WebSockets - just REST API + Web Speech API
 */

export interface ConversationMessage {
  id: string;
  type: 'user' | 'agent';
  text: string;
  timestamp: number;
}

export class SimpleConversation {
  private recognition: any = null;
  private currentAudio: HTMLAudioElement | null = null;
  private isListening = false;
  private isAgentSpeaking = false;

  // Callbacks
  private onMessageCallback?: (message: ConversationMessage) => void;
  private onAgentSpeakingCallback?: (speaking: boolean) => void;
  private onListeningCallback?: (listening: boolean) => void;

  constructor() {
    this.setupSpeechRecognition();
  }

  /**
   * Setup Web Speech API
   */
  private setupSpeechRecognition() {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('❌ Web Speech API not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false; // Stop after one result
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      
      console.log(`🎤 User said: "${transcript}" (${(confidence * 100).toFixed(0)}% confidence)`);
      
      this.onMessageCallback?.({
        id: Date.now().toString(),
        type: 'user',
        text: transcript,
        timestamp: Date.now(),
      });
      
      this.stopListening();
    };

    this.recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('❌ Speech recognition error:', event.error);
      }
      this.stopListening();
    };

    this.recognition.onend = () => {
      this.stopListening();
    };
  }

  /**
   * Agent speaks using ElevenLabs TTS
   */
  async speak(text: string): Promise<void> {
    try {
      console.log(`🤖 Agent speaking: "${text}"`);
      this.isAgentSpeaking = true;
      this.onAgentSpeakingCallback?.(true);

      // Add agent message to transcript
      this.onMessageCallback?.({
        id: Date.now().toString(),
        type: 'agent',
        text: text,
        timestamp: Date.now(),
      });

      // Get audio from ElevenLabs TTS
      const response = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          voiceId: 'EXAVITQu4vr4xnSDxMaL' // Default ElevenLabs voice
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get TTS audio: ${errorText}`);
      }

      const audioBlob = await response.blob();
      console.log('🎵 Got audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play audio
      this.currentAudio = new Audio(audioUrl);
      
      this.currentAudio.onended = () => {
        console.log('🔊 Agent finished speaking');
        this.isAgentSpeaking = false;
        this.onAgentSpeakingCallback?.(false);
        
        // Auto-start listening for user response
        setTimeout(() => this.startListening(), 500);
      };

      this.currentAudio.onerror = (e) => {
        console.error('❌ Audio playback error:', e);
        this.isAgentSpeaking = false;
        this.onAgentSpeakingCallback?.(false);
      };

      await this.currentAudio.play();
      console.log('🔊 Playing agent audio');
      
    } catch (error) {
      console.error('❌ Error in speak():', error);
      this.isAgentSpeaking = false;
      this.onAgentSpeakingCallback?.(false);
      throw error;
    }
  }

  /**
   * Start listening for user speech
   */
  startListening() {
    if (this.isListening || !this.recognition) return;
    
    try {
      this.isListening = true;
      this.onListeningCallback?.(true);
      this.recognition.start();
      console.log('🎤 Started listening for user...');
    } catch (error) {
      console.error('❌ Error starting recognition:', error);
      this.stopListening();
    }
  }

  /**
   * Stop listening
   */
  stopListening() {
    if (!this.isListening) return;
    
    try {
      this.recognition?.stop();
    } catch (e) {
      // Already stopped
    }
    
    this.isListening = false;
    this.onListeningCallback?.(false);
    console.log('🎤 Stopped listening');
  }

  /**
   * Stop agent speaking
   */
  stopSpeaking() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.isAgentSpeaking = false;
    this.onAgentSpeakingCallback?.(false);
  }

  /**
   * Set callback for messages
   */
  onMessage(callback: (message: ConversationMessage) => void) {
    this.onMessageCallback = callback;
  }

  /**
   * Set callback for agent speaking state
   */
  onAgentSpeaking(callback: (speaking: boolean) => void) {
    this.onAgentSpeakingCallback = callback;
  }

  /**
   * Set callback for listening state
   */
  onListening(callback: (listening: boolean) => void) {
    this.onListeningCallback = callback;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopListening();
    this.stopSpeaking();
    this.recognition = null;
  }
}


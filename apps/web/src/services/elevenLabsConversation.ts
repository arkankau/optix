/**
 * ElevenLabs Conversational AI Service
 * Handles WebSocket connection, audio streaming, and transcript capture
 */

export interface ConversationMessage {
  id: string;
  type: 'user' | 'agent';
  text: string;
  timestamp: number;
}

export class ElevenLabsConversation {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private keepAliveInterval: number | null = null;

  // Callbacks
  private onMessageCallback?: (message: ConversationMessage) => void;
  private onStatusCallback?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  private onAgentSpeakingCallback?: (speaking: boolean) => void;

  constructor() {
    this.audioContext = new AudioContext();
  }

  /**
   * Connect to ElevenLabs Conversational AI
   */
  async connect(agentId: string) {
    try {
      this.onStatusCallback?.('connecting');
      console.log('🔌 Connecting to ElevenLabs agent:', agentId);

      // Get signed URL from backend
      const response = await fetch('/api/elevenlabs/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to get signed URL');
      }

      const { signedUrl } = await response.json();

      // Connect WebSocket
      this.ws = new WebSocket(signedUrl);
      
      this.ws.onopen = async () => {
        console.log('✅ WebSocket connected');
        this.onStatusCallback?.('connected');
        
        // Start keepalive ping every 30 seconds
        this.keepAliveInterval = window.setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ 
              type: 'ping',
              event_id: Date.now()
            }));
            console.log('💓 Keepalive ping sent');
          }
        }, 30000);
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.onStatusCallback?.('error');
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        
        // Clear keepalive interval
        if (this.keepAliveInterval) {
          clearInterval(this.keepAliveInterval);
          this.keepAliveInterval = null;
        }
        
        this.onStatusCallback?.('disconnected');
      };

    } catch (error) {
      console.error('❌ Connection error:', error);
      this.onStatusCallback?.('error');
      throw error;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleWebSocketMessage(event: MessageEvent) {
    try {
      // Handle binary audio data
      if (event.data instanceof Blob) {
        console.log('🎵 Received audio blob');
        const arrayBuffer = await event.data.arrayBuffer();
        if (this.audioContext && arrayBuffer.byteLength > 0) {
          try {
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioQueue.push(audioBuffer);
            if (!this.isPlaying) {
              this.playNextInQueue();
            }
            this.onAgentSpeakingCallback?.(true);
          } catch (e) {
            console.error('Error decoding audio:', e);
          }
        }
        return;
      }

      // Handle JSON messages
      const data = JSON.parse(event.data);
      
      console.log('📨 WebSocket message:', data.type, data);

      switch (data.type) {
        case 'conversation_initiation_metadata':
          console.log('🎤 Agent ready to speak - metadata:', data.conversation_initiation_metadata_event);
          
          // Start listening for user audio
          await this.startListening();
          
          // Send initial user audio or text to trigger agent greeting
          // The agent needs something to respond to
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              type: 'user_transcript',
              user_transcript: 'Hello'
            }));
            console.log('👋 Sent initial greeting to trigger agent');
          }
          break;

        case 'audio':
          // Audio chunk from agent
          if (data.audio_event?.audio_base_64) {
            await this.playAgentAudioBase64(data.audio_event.audio_base_64);
            this.onAgentSpeakingCallback?.(true);
          }
          break;

        case 'user_transcript':
        case 'user_transcription':
          // User speech transcript
          if (data.user_transcription_event?.user_transcript || data.transcript) {
            const transcript = data.user_transcription_event?.user_transcript || data.transcript;
            console.log('👤 User said:', transcript);
            this.onMessageCallback?.({
              id: Date.now().toString(),
              type: 'user',
              text: transcript,
              timestamp: Date.now(),
            });
          }
          break;

        case 'agent_response':
        case 'agent_transcript':
          // Agent response transcript
          if (data.agent_response_event?.agent_response || data.transcript) {
            const transcript = data.agent_response_event?.agent_response || data.transcript;
            console.log('🤖 Agent said:', transcript);
            this.onMessageCallback?.({
              id: Date.now().toString(),
              type: 'agent',
              text: transcript,
              timestamp: Date.now(),
            });
          }
          break;

        case 'agent_response_correction':
          // Corrected agent transcript
          if (data.agent_response_correction_event?.corrected_agent_response) {
            console.log('🤖 Agent said (corrected):', data.agent_response_correction_event.corrected_agent_response);
            this.onMessageCallback?.({
              id: Date.now().toString(),
              type: 'agent',
              text: data.agent_response_correction_event.corrected_agent_response,
              timestamp: Date.now(),
            });
          }
          break;

        case 'interruption':
          console.log('⏸️ Conversation interrupted');
          this.onAgentSpeakingCallback?.(false);
          break;

        case 'ping':
          // Respond to ping
          if (this.ws?.readyState === WebSocket.OPEN) {
            const eventId = data.ping_event?.event_id || data.event_id;
            this.ws.send(JSON.stringify({ 
              type: 'pong',
              event_id: eventId,
            }));
            console.log('🏓 Pong sent for event:', eventId);
          }
          break;

        default:
          console.log('📨 Unhandled message type:', data.type, data);
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error, event.data);
    }
  }

  /**
   * Start capturing user audio
   */
  async startListening() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      // Use MediaRecorder with supported format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
        
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
          // Send binary audio data directly
          const arrayBuffer = await event.data.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          
          this.ws.send(JSON.stringify({
            type: 'user_audio_chunk',
            chunk: {
              audio_base_64: base64,
            },
          }));
          
          console.log(`🎙️ Sent audio chunk: ${event.data.size} bytes`);
        }
      };

      this.mediaRecorder.start(100); // Send chunks every 100ms
      console.log('🎤 Started listening');
    } catch (error) {
      console.error('❌ Error starting microphone:', error);
      throw error;
    }
  }

  /**
   * Stop capturing user audio
   */
  stopListening() {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      console.log('🎤 Stopped listening');
    }
  }

  /**
   * Play agent audio response from base64
   * Uses HTML5 Audio for better format support (MP3, etc.)
   */
  private async playAgentAudioBase64(base64Audio: string) {
    try {
      // ElevenLabs sends MP3 audio - use HTML5 Audio element
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audio.volume = 1.0;
      
      audio.onended = () => {
        console.log('🔊 Audio playback complete');
        this.onAgentSpeakingCallback?.(false);
      };
      
      audio.onerror = (e) => {
        console.error('❌ Audio playback error:', e);
        this.onAgentSpeakingCallback?.(false);
      };
      
      await audio.play();
      console.log('🔊 Playing agent audio');
    } catch (error) {
      console.error('❌ Error playing audio:', error);
    }
  }

  /**
   * Play next audio in queue
   */
  private playNextInQueue() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;
    
    const source = this.audioContext!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext!.destination);
    
    source.onended = () => {
      this.playNextInQueue();
    };
    
    source.start();
  }

  /**
   * Send text message to agent (for system instructions)
   */
  sendMessage(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'user_message',
        text,
      }));
      console.log('📤 Sent message to agent:', text);
    }
  }

  /**
   * Set callback for new messages
   */
  onMessage(callback: (message: ConversationMessage) => void) {
    this.onMessageCallback = callback;
  }

  /**
   * Set callback for status changes
   */
  onStatus(callback: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void) {
    this.onStatusCallback = callback;
  }

  /**
   * Set callback for agent speaking state
   */
  onAgentSpeaking(callback: (speaking: boolean) => void) {
    this.onAgentSpeakingCallback = callback;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    this.stopListening();
    
    // Clear keepalive interval
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    
    this.ws?.close();
    this.audioContext?.close();
    this.ws = null;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.audioQueue = [];
    console.log('🔌 Disconnected');
  }
}


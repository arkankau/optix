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
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.onStatusCallback?.('connected');
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
  private handleWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      console.log('📨 WebSocket message:', data.type);

      switch (data.type) {
        case 'conversation_initiation_metadata':
          console.log('🎤 Agent ready to speak');
          break;

        case 'agent_response':
          // Agent is speaking - play audio and capture transcript
          if (data.audio) {
            this.playAgentAudio(data.audio);
          }
          if (data.transcript) {
            this.onMessageCallback?.({
              id: Date.now().toString(),
              type: 'agent',
              text: data.transcript,
              timestamp: Date.now(),
            });
          }
          this.onAgentSpeakingCallback?.(true);
          break;

        case 'user_transcript':
          // User speech transcript
          if (data.transcript) {
            this.onMessageCallback?.({
              id: Date.now().toString(),
              type: 'user',
              text: data.transcript,
              timestamp: Date.now(),
            });
          }
          break;

        case 'agent_response_complete':
          this.onAgentSpeakingCallback?.(false);
          break;

        case 'ping':
          // Respond to ping
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'pong', event_id: data.event_id }));
          }
          break;

        default:
          console.log('📨 Unhandled message type:', data.type);
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
    }
  }

  /**
   * Start capturing user audio
   */
  async startListening() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
          // Convert to base64 and send to agent
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            this.ws?.send(JSON.stringify({
              type: 'user_audio_chunk',
              audio_chunk: base64,
            }));
          };
          reader.readAsDataURL(event.data);
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
   * Play agent audio response
   */
  private async playAgentAudio(base64Audio: string) {
    try {
      if (!this.audioContext) return;

      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);
      
      // Add to queue and play
      this.audioQueue.push(audioBuffer);
      if (!this.isPlaying) {
        this.playNextInQueue();
      }
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
    this.ws?.close();
    this.audioContext?.close();
    this.ws = null;
    this.mediaRecorder = null;
    this.audioContext = null;
    this.audioQueue = [];
    console.log('🔌 Disconnected');
  }
}


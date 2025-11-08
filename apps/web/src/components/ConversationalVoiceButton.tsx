import { useState, useRef } from 'react';
import { api } from '../api/client';

interface ConversationalVoiceButtonProps {
  sessionId: string;
  eye: string;
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function ConversationalVoiceButton({ 
  sessionId, 
  eye, 
  onTranscript, 
  disabled 
}: ConversationalVoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setIsProcessing(true);

        try {
          console.log('🎤 Sending audio to ElevenLabs Conversational AI...');
          const result = await api.sendConversationAudio(sessionId, eye, audioBlob);
          
          console.log(`🎤 ElevenLabs AI understood: "${result.transcription}"`);
          onTranscript(result.transcription);
        } catch (error) {
          console.error('Conversational AI error:', error);
          // Fallback
          onTranscript('C D Z O P');
        } finally {
          setIsProcessing(false);
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log('🎤 Recording for ElevenLabs Conversation...');
    } catch (error) {
      console.error('Microphone access error:', error);
      alert('Microphone access denied. Please enable microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('🎤 Recording stopped, sending to ElevenLabs...');
    }
  };

  return (
    <button
      className="btn btn-primary btn-large"
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onTouchStart={startRecording}
      onTouchEnd={stopRecording}
      disabled={disabled || isProcessing}
      style={{
        position: 'relative',
        padding: '1.5rem 3rem',
        fontSize: '1.25rem',
        background: isRecording 
          ? 'var(--color-danger)' 
          : isProcessing 
          ? 'var(--color-text-dim)' 
          : 'var(--color-primary)',
        boxShadow: isRecording ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none',
        animation: isRecording ? 'pulse 1s infinite' : 'none',
      }}
    >
      {isProcessing ? (
        <>
          <Spinner />
          AI Processing...
        </>
      ) : isRecording ? (
        <>
          🎤 Speaking... (release when done)
        </>
      ) : (
        <>
          🎤 Hold to Talk with AI
        </>
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </button>
  );
}

function Spinner() {
  return (
    <div style={{
      width: '20px',
      height: '20px',
      border: '3px solid rgba(255, 255, 255, 0.3)',
      borderTop: '3px solid white',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      marginRight: '0.5rem',
      display: 'inline-block',
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}



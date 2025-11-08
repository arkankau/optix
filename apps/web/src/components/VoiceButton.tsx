import { useState, useRef, useEffect } from 'react';

interface VoiceButtonProps {
  onTranscript: (text: string, confidence: number) => void;
  disabled?: boolean;
}

// Check if browser supports Web Speech API
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!SpeechRecognition) {
      console.error('❌ Web Speech API not supported in this browser');
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const result = event.results[0][0];
      const transcript = result.transcript.toUpperCase().trim();
      const confidence = result.confidence;
      
      console.log(`🎤 Browser STT parsed: "${transcript}" (${(confidence * 100).toFixed(0)}% confidence)`);
      
      setIsProcessing(false);
      setIsRecording(false);
      onTranscript(transcript, confidence);
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      setIsProcessing(false);
      setIsRecording(false);
      
      if (event.error === 'no-speech') {
        alert('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please enable microphone permissions.');
      }
    };

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      setIsRecording(false);
      setIsProcessing(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript]);

  const startRecording = () => {
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    try {
      setIsProcessing(true);
      recognitionRef.current?.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      console.log('🎤 Stopping speech recognition...');
    }
  };

  return (
    <button
      className="btn btn-primary btn-large"
      onClick={isRecording ? stopRecording : startRecording}
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
          Starting...
        </>
      ) : isRecording ? (
        <>
          🎤 Listening... (click to stop)
        </>
      ) : (
        <>
          🎤 Click to Speak
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
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}



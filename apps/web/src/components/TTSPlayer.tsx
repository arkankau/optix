import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface TTSPlayerProps {
  text: string;
  autoPlay?: boolean;
  onComplete?: () => void;
}

export default function TTSPlayer({ text, autoPlay = false, onComplete }: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const play = async () => {
    if (isPlaying) return;

    try {
      setIsPlaying(true);
      console.log(`🔊 Using ElevenLabs for prompt: "${text}"`);
      
      const audioBuffer = await api.tts(text);
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        onComplete?.();
      };
      
      await audio.play();
    } catch (error) {
      console.error('TTS playback error:', error);
      setIsPlaying(false);
      onComplete?.();
    }
  };

  useEffect(() => {
    if (autoPlay && text) {
      play();
    }
  }, [text, autoPlay]);

  return (
    <button
      onClick={play}
      disabled={isPlaying}
      className="btn btn-secondary"
      style={{ minWidth: '120px' }}
    >
      {isPlaying ? (
        <>
          <Spinner /> Speaking...
        </>
      ) : (
        <>🔊 Play Prompt</>
      )}
    </button>
  );
}

function Spinner() {
  return (
    <div style={{
      width: '16px',
      height: '16px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderTop: '2px solid white',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      marginRight: '0.5rem',
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}



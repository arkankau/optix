import { useEffect, useState } from 'react';
import { useAI } from '../contexts/AIContext';
import { useTestStore } from '../store/testStore';
import { useAIAgent } from '../hooks/useAIAgent';
import ElevenLabsWidget from './ElevenLabsWidget';

interface GlobalAIAssistantProps {
  agentId: string;
}

export default function GlobalAIAssistant({ agentId }: GlobalAIAssistantProps) {
  const { isAIActive } = useAI();
  const { stage, currentEye, calibration, sessionId } = useTestStore();
  const { startAgent, processAIMessage, agentThinking } = useAIAgent();
  const [isReady, setIsReady] = useState(false);
  const [lastStage, setLastStage] = useState(stage);
  const [messageLog, setMessageLog] = useState<string[]>([]);

  // Start AI agent when AI is activated (don't wait for widget)
  useEffect(() => {
    console.log('🔍 Agent check:', { isAIActive });
    if (isAIActive) {
      startAgent();
      console.log('✅ Agentic AI activated - full auto-control enabled');
    } else {
      console.log('⏳ Waiting for AI to be activated');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAIActive]); // Only run when AI activation state changes

  // Monitor stage changes (logging only - no auto-trigger)
  useEffect(() => {
    if (lastStage !== stage && isAIActive) {
      console.log(`📊 Stage changed: ${lastStage} → ${stage}`);
      setLastStage(stage);
      
      // NOTE: Auto-trigger disabled - progression now happens ONLY through voice interactions
      // The AI examiner in ElevenLabs will guide the patient and trigger stage changes
      // via voice commands that get processed through handleMessage
    }
  }, [stage, lastStage, isAIActive]);

  // REMOVED: Auto-trigger was just for debugging
  // Real progression happens when ElevenLabs AI sends completion messages

  const handleMessage = async (message: string, isUser: boolean) => {
    console.log(`🎤 ${isUser ? 'Patient' : 'AI Examiner'}: ${message}`);
    setMessageLog(prev => [...prev, `${isUser ? 'Patient' : 'AI'}: ${message}`].slice(-10));

    if (!isUser) {
      // AI is speaking - let the agent process and take action
      await processAIMessage(message, isUser);
    }
  };

  const handleReady = () => {
    console.log('✅ ElevenLabs Widget is ready!');
    setIsReady(true);
    console.log('📊 State after ready:', { isAIActive });
  };

  // Manual test trigger removed - real progression happens via ElevenLabs AI messages

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        display: isAIActive ? 'block' : 'none',
      }}>
        <ElevenLabsWidget
          agentId={agentId}
          onMessage={handleMessage}
          onReady={handleReady}
        />
      </div>

      {/* Debug Panel */}
      {isAIActive && messageLog.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 10000,
          maxWidth: '300px',
          maxHeight: '200px',
          overflow: 'auto',
          padding: '0.75rem',
          background: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          borderRadius: '0.5rem',
          fontSize: '0.75rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        }}>
          <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
            📝 Message Log:
          </div>
          {messageLog.map((msg, i) => (
            <div key={i} style={{ marginBottom: '0.25rem', opacity: 0.9 }}>
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* Agent thinking indicator */}
      {agentThinking && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          padding: '0.75rem 1rem',
          background: 'rgba(59, 130, 246, 0.9)',
          color: 'white',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            border: '2px solid white',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          AI Agent Thinking...
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}


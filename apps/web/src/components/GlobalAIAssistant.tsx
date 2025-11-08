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
  const { startAgent, processAIMessage, agentThinking, executeManualAction, lastMessage } = useAIAgent();
  const [isReady, setIsReady] = useState(false);
  const [lastStage, setLastStage] = useState(stage);
  const [messageLog, setMessageLog] = useState<string[]>([]);
  const [showManualControls, setShowManualControls] = useState(true);

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

    if (isUser) {
      // Patient is speaking - store transcription and trigger xAI analysis
      console.log('👤 Patient speech detected, storing transcription');
      
      // Store the patient transcription
      useTestStore.getState().addPatientTranscription({
        timestamp: Date.now(),
        text: message,
        eye: currentEye,
        line: 0, // Will be set by the test page
        stage,
      });

      // The test page components will handle xAI analysis when appropriate
    } else {
      // AI Examiner is speaking - let the agent process and take action
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

      {/* Manual Controls for Debugging */}
      {isAIActive && showManualControls && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          zIndex: 9998,
          background: 'rgba(0, 0, 0, 0.9)',
          padding: '1rem',
          borderRadius: '0.5rem',
          border: '2px solid rgba(245, 158, 11, 0.5)',
          maxWidth: '300px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}>
            <h4 style={{ color: 'white', fontSize: '0.875rem', margin: 0 }}>
              🎮 Manual Controls
            </h4>
            <button
              onClick={() => setShowManualControls(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1.25rem',
              }}
            >
              ×
            </button>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '0.5rem' }}>
            Stage: <strong style={{ color: 'white' }}>{stage}</strong>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '0.75rem', maxHeight: '60px', overflow: 'auto' }}>
            Last: {lastMessage.substring(0, 80)}...
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stage === 'calibration' && (
              <button
                onClick={() => executeManualAction('complete_calibration')}
                style={{
                  padding: '0.5rem',
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.5)',
                  color: 'white',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
              >
                ✅ Complete Calibration
              </button>
            )}

            {(stage === 'sphere_od' || stage === 'sphere_os') && (
              <button
                onClick={() => executeManualAction('complete_sphere')}
                style={{
                  padding: '0.5rem',
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.5)',
                  color: 'white',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
              >
                ✅ Complete {currentEye} Sphere Test
              </button>
            )}

            {(stage === 'jcc_od' || stage === 'jcc_os') && (
              <button
                onClick={() => executeManualAction('complete_astigmatism')}
                style={{
                  padding: '0.5rem',
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.5)',
                  color: 'white',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
              >
                ✅ Complete Astigmatism Test
              </button>
            )}
          </div>
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


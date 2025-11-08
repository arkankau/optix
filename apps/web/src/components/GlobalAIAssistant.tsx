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
  const { stage, currentEye, setElevenLabsReady, addPatientTranscription } = useTestStore();
  const { startAgent, agentThinking, executeManualAction, lastMessage } = useAIAgent();
  const [lastStage, setLastStage] = useState(stage);
  const [showManualControls, setShowManualControls] = useState(false); // Hidden by default - xAI controls everything
  const [widgetReady, setWidgetReady] = useState(false);

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

  // Keyboard shortcut to toggle manual controls (for debugging)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        setShowManualControls(prev => !prev);
        console.log('🎮 Manual controls toggled');
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Monitor stage changes
  useEffect(() => {
    if (lastStage !== stage && isAIActive) {
      console.log(`📊 Stage changed: ${lastStage} → ${stage}`);
      setLastStage(stage);
    }
  }, [stage, lastStage, isAIActive]);

  // Handle ElevenLabs widget ready
  const handleWidgetReady = () => {
    console.log('✅ ElevenLabs widget is ready');
    setWidgetReady(true);
    setElevenLabsReady(true);
  };

  // Handle messages from ElevenLabs widget
  const handleWidgetMessage = (message: string, isUser: boolean) => {
    console.log(`🎤 ElevenLabs ${isUser ? 'User' : 'AI'}: ${message}`);
    
    // Only process user messages (patient speech)
    // AI messages are just the agent speaking back
    if (isUser) {
      // Store patient transcription for the current stage
      // The specific test pages (SphereTest, JCCTest) will handle the analysis
      addPatientTranscription({
        timestamp: Date.now(),
        text: message,
        eye: currentEye,
        line: 0, // Will be set by the test page
        stage: stage,
      });
    }
  };

  return (
    <>
      {/* ElevenLabs Conversational Widget - Global Floating */}
      {isAIActive && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
        }}>
          <ElevenLabsWidget
            agentId={agentId}
            onMessage={handleWidgetMessage}
            onReady={handleWidgetReady}
          />
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


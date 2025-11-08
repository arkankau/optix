import { useEffect, useState, useRef } from 'react';
import { useAI } from '../contexts/AIContext';
import { useTestStore } from '../store/testStore';
import { useAIAgent } from '../hooks/useAIAgent';
import ConversationPanel from './ConversationPanel';
import { SimpleConversation, ConversationMessage } from '../services/simpleConversation';

interface GlobalAIAssistantProps {
  agentId?: string; // Optional - will be fetched from backend
}

export default function GlobalAIAssistant({ agentId: providedAgentId }: GlobalAIAssistantProps) {
  const { isAIActive } = useAI();
  const { stage, currentEye, setElevenLabsReady, addPatientTranscription } = useTestStore();
  const { startAgent, agentThinking, executeManualAction, lastMessage } = useAIAgent();
  const [lastStage, setLastStage] = useState(stage);
  const [showManualControls, setShowManualControls] = useState(false);
  
  // Conversation state
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  
  const conversationRef = useRef<SimpleConversation | null>(null);

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

  // Initialize simple conversation when AI is activated
  useEffect(() => {
    if (isAIActive && !conversationRef.current) {
      initializeConversation();
    }

    return () => {
      // Cleanup on unmount
      conversationRef.current?.destroy();
    };
  }, [isAIActive]);

  // Initialize conversation
  const initializeConversation = () => {
    try {
      console.log('🎤 Initializing simple conversation...');
      
      // Create conversation instance
      const conversation = new SimpleConversation();
      conversationRef.current = conversation;

      // Set up callbacks
      conversation.onMessage((message) => {
        console.log(`💬 ${message.type}: ${message.text}`);
        setMessages((prev) => [...prev, message]);

        // If user message, store for xAI analysis
        if (message.type === 'user') {
          addPatientTranscription({
            timestamp: message.timestamp,
            text: message.text,
            eye: currentEye,
            line: 0, // Will be set by test page
            stage: stage,
          });
        }
      });

      conversation.onAgentSpeaking((speaking) => {
        setIsAgentSpeaking(speaking);
      });

      conversation.onListening((listening) => {
        setIsListening(listening);
      });

      // Ready immediately
      setElevenLabsReady(true);
      setShowPanel(true);

      // Initial greeting
      conversation.speak('Hello! I\'m your eye test assistant. Let\'s begin the examination. Please cover your left eye and look at the chart.');

      console.log('✅ Simple conversation initialized');
    } catch (error) {
      console.error('❌ Failed to initialize conversation:', error);
      setElevenLabsReady(false);
    }
  };

  // Handle start/stop listening
  const handleStartListening = () => {
    conversationRef.current?.startListening();
    setIsListening(true);
  };

  const handleStopListening = () => {
    conversationRef.current?.stopListening();
    setIsListening(false);
  };

  // Handle close panel
  const handleClosePanel = () => {
    conversationRef.current?.disconnect();
    setShowPanel(false);
    setStatus('disconnected');
    setElevenLabsReady(false);
  };

  return (
    <>
      {/* Conversation Panel - Floating with movie-style subtitles */}
      {showPanel && (
        <ConversationPanel
          messages={messages}
          isListening={isListening}
          isAgentSpeaking={isAgentSpeaking}
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
          onClose={handleClosePanel}
        />
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



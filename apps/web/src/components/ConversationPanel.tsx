import { useState, useEffect, useRef } from 'react';
import type { ConversationMessage } from '../services/elevenLabsConversation';

interface ConversationPanelProps {
  messages: ConversationMessage[];
  isListening: boolean;
  isAgentSpeaking: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onClose: () => void;
}

export default function ConversationPanel({
  messages,
  isListening,
  isAgentSpeaking,
  onStartListening,
  onStopListening,
  onClose,
}: ConversationPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get last message for subtitle display
  const lastMessage = messages[messages.length - 1];

  return (
    <>
      {/* Movie-Style Subtitle Overlay */}
      {lastMessage && !isMinimized && (
        <div style={{
          position: 'fixed',
          bottom: '140px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10001,
          maxWidth: '800px',
          width: '90%',
          pointerEvents: 'none',
          animation: 'fadeInUp 0.3s ease-out',
        }}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.85)',
            padding: '1rem 2rem',
            borderRadius: '0.5rem',
            backdropFilter: 'blur(10px)',
            border: lastMessage.type === 'user' 
              ? '2px solid rgba(59, 130, 246, 0.6)' 
              : '2px solid rgba(16, 185, 129, 0.6)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: lastMessage.type === 'user' ? '#60a5fa' : '#34d399',
              marginBottom: '0.25rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              {lastMessage.type === 'user' ? '👤 YOU' : '🤖 AI ASSISTANT'}
            </div>
            <div style={{
              fontSize: '1.25rem',
              color: 'white',
              lineHeight: '1.6',
              textAlign: 'center',
              fontWeight: 500,
            }}>
              "{lastMessage.text}"
            </div>
          </div>
        </div>
      )}

      {/* Floating Conversation Panel */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 10000,
        width: isMinimized ? '300px' : '420px',
        maxHeight: isMinimized ? '60px' : '600px',
        background: 'rgba(10, 10, 11, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '1rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: isMinimized ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: status === 'connected' 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(59, 130, 246, 0.1))' 
            : 'rgba(239, 68, 68, 0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: status === 'connected' ? '#10b981' : '#ef4444',
              boxShadow: status === 'connected' 
                ? '0 0 12px rgba(16, 185, 129, 0.8)' 
                : '0 0 12px rgba(239, 68, 68, 0.8)',
              animation: status === 'connected' ? 'pulse 2s infinite' : 'none',
            }} />
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>
                AI Assistant
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                {status === 'connecting' && 'Connecting...'}
                {status === 'connected' && (isAgentSpeaking ? 'Speaking...' : 'Listening...')}
                {status === 'disconnected' && 'Disconnected'}
                {status === 'error' && 'Connection Error'}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1.25rem',
                padding: '0.25rem',
              }}
            >
              {isMinimized ? '⬆️' : '⬇️'}
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '1.25rem',
                padding: '0.25rem',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages - Only show when not minimized */}
        {!isMinimized && (
          <>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              {messages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: '#6b7280',
                  fontSize: '0.875rem',
                  padding: '2rem',
                }}>
                  Conversation will appear here...
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: message.type === 'user' ? 'flex-end' : 'flex-start',
                      animation: 'fadeIn 0.3s ease-out',
                    }}
                  >
                    <div style={{
                      maxWidth: '85%',
                      padding: '0.75rem 1rem',
                      borderRadius: '1rem',
                      background: message.type === 'user'
                        ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                        : 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                    }}>
                      {message.text}
                    </div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: '#6b7280',
                      marginTop: '0.25rem',
                      paddingLeft: message.type === 'agent' ? '0.5rem' : '0',
                      paddingRight: message.type === 'user' ? '0.5rem' : '0',
                    }}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Controls */}
            <div style={{
              padding: '1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
            }}>
              <button
                onClick={isListening ? onStopListening : onStartListening}
                disabled={status !== 'connected'}
                style={{
                  flex: 1,
                  padding: '0.875rem 1.5rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: isListening
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                    : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: status === 'connected' ? 'pointer' : 'not-allowed',
                  opacity: status === 'connected' ? 1 : 0.5,
                  boxShadow: isListening 
                    ? '0 0 20px rgba(239, 68, 68, 0.5)' 
                    : '0 4px 12px rgba(59, 130, 246, 0.3)',
                  animation: isListening ? 'pulse 1.5s infinite' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {isListening ? '🎤 Stop Speaking' : '🎤 Start Speaking'}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
      `}</style>
    </>
  );
}


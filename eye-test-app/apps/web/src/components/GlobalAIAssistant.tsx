import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAI } from '../contexts/AIContext';
import { useTestStore } from '../store/testStore';
import { useAIAgent } from '../hooks/useAIAgent';
import ConversationPanel, { ConversationMessage } from './ConversationPanel';
import { SimpleConversationFlow } from '../services/simpleConversationFlow';
import { ConversationOrchestrator } from '../services/conversationOrchestrator';

interface GlobalAIAssistantProps {
  agentId?: string; // Not used anymore but keeping for compatibility
}

export default function GlobalAIAssistant({ agentId: providedAgentId }: GlobalAIAssistantProps) {
  const navigate = useNavigate();
  const { isAIActive } = useAI();
  const { stage, currentEye, setElevenLabsReady, addPatientTranscription, addXAIAnalysis, setCurrentTestLine, setCurrentEye, setSphereResult, setStage } = useTestStore();
  const { startAgent, agentThinking, executeManualAction, lastMessage } = useAIAgent();
  const [lastStage, setLastStage] = useState(stage);
  const [showManualControls, setShowManualControls] = useState(false);
  
  // Conversation state
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  
  // Simple conversation flow (ElevenLabs + Web Speech API + xAI)
  const conversationRef = useRef<SimpleConversationFlow | null>(null);
  const orchestratorRef = useRef<ConversationOrchestrator | null>(null);

  // Start AI agent when AI is activated
  useEffect(() => {
    console.log('🔍 Agent check:', { isAIActive });
    if (isAIActive) {
      startAgent();
      console.log('✅ AI activated - initializing simple conversation flow');
    } else {
      console.log('⏳ Waiting for AI to be activated');
    }
  }, [isAIActive]);

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
      
      // Start test when stage changes to sphere
      if (stage === 'sphere_od' && orchestratorRef.current) {
        setTimeout(() => {
          orchestratorRef.current?.startSphereTest('OD');
        }, 1000);
      } else if (stage === 'sphere_os' && orchestratorRef.current) {
        setTimeout(() => {
          orchestratorRef.current?.startSphereTest('OS');
        }, 1000);
      }
    }
  }, [stage, lastStage, isAIActive]);

  // Initialize simple conversation flow when AI is activated
  useEffect(() => {
    if (isAIActive && !conversationRef.current) {
      initializeSimpleConversation();
    }

    return () => {
      // Cleanup on unmount
      conversationRef.current?.destroy();
      conversationRef.current = null;
      orchestratorRef.current = null;
    };
  }, [isAIActive]);

  // Initialize the simple conversation system
  const initializeSimpleConversation = async () => {
    try {
      console.log('🎤 Initializing Simple Conversation Flow (ElevenLabs + Web Speech + xAI)...');
      
      // Create conversation flow
      const conversation = new SimpleConversationFlow({
        onAgentSpeaking: (speaking) => {
          setIsAgentSpeaking(speaking);
          console.log(speaking ? '🗣️ Agent speaking' : '✅ Agent finished');
        },
        onListening: (listening) => {
          setIsListening(listening);
          console.log(listening ? '👂 Listening for user' : '🛑 Stopped listening');
        },
        onMessage: (message) => {
          console.log(`💬 ${message.type}: "${message.text}"`);
          
          // Add to conversation panel
          const msg: ConversationMessage = {
            id: `${message.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: message.type,
            text: message.text,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, msg]);
          
          // Store user transcriptions
          if (message.type === 'user') {
            addPatientTranscription({
              timestamp: msg.timestamp,
              text: msg.text,
              eye: currentEye,
              line: orchestratorRef.current?.getState().currentLine || 1,
              stage: stage,
            });
            
            // Handle user response through orchestrator
            orchestratorRef.current?.handleUserResponse(message.text);
          }
        },
        onError: (error) => {
          console.error('❌ Conversation error:', error);
        },
      });
      
      conversationRef.current = conversation;
      
      // Create orchestrator (xAI brain)
      const orchestrator = new ConversationOrchestrator({
        conversation,
        onLineAdvance: (line) => {
          console.log(`⬇️ Advancing to line ${line}`);
          setCurrentTestLine(line);
        },
        onEyeSwitch: (eye) => {
          console.log(`👁️ Switching to ${eye}`);
          setCurrentEye(eye);
          const newStage = eye === 'OD' ? 'sphere_od' : 'sphere_os';
          setStage(newStage);
        },
        onTestComplete: (testStage) => {
          console.log(`✅ ${testStage} test complete`);
          
          if (testStage === 'sphere') {
            // Calculate and save sphere results
            const state = orchestrator.getState();
            const analyses = state.analyses;
            
            // Save results for both eyes
            ['OD', 'OS'].forEach(eye => {
              const eyeAnalyses = analyses.filter((a: any) => a.eye === eye);
              if (eyeAnalyses.length > 0) {
                const lastCorrectLine = eyeAnalyses
                  .filter((a: any) => a.correct)
                  .map((a: any) => a.line)
                  .sort((a: number, b: number) => b - a)[0] || 1;
                
                const lineToLogMAR = (line: number) => Math.round((11 - line) * 0.1 * 100) / 100;
                const lineToSphere = (line: number) => -lineToLogMAR(line) * 4;
                
                setSphereResult(eye as 'OD' | 'OS', {
                  threshold: lineToLogMAR(lastCorrectLine),
                  sphere: lineToSphere(lastCorrectLine),
                  confidence: 0.85,
                });
                
                console.log(`💾 Saved sphere result for ${eye}:`, {
                  line: lastCorrectLine,
                  sphere: lineToSphere(lastCorrectLine),
                });
              }
            });
            
            // Navigate to JCC
            setTimeout(() => {
              setCurrentEye('OD');
              setStage('jcc_od');
              navigate('/jcc');
            }, 3000);
          }
        },
        onXAIAnalysis: (analysis) => {
          console.log('🧠 xAI Analysis:', analysis);
          addXAIAnalysis({
            timestamp: Date.now(),
            patientSpeech: analysis.patientSpeech || '',
            expectedLetters: analysis.expectedLetters || '',
            eye: currentEye,
            line: orchestratorRef.current?.getState().currentLine || 1,
            correct: analysis.correct,
            confidence: analysis.confidence,
            suggestedDiopter: analysis.suggestedDiopter || 0,
            recommendation: analysis.recommendation,
            reasoning: analysis.reasoning,
          });
        },
      });
      
      orchestratorRef.current = orchestrator;
      
      // Ready!
      setElevenLabsReady(true);
      setShowPanel(true);
      
      console.log('✅ Simple Conversation Flow initialized!');
      console.log('   ElevenLabs = Voice Quality');
      console.log('   Web Speech API = STT');
      console.log('   xAI = Brain/Decisions');
      
    } catch (error) {
      console.error('❌ Failed to initialize conversation:', error);
      setElevenLabsReady(false);
    }
  };

  // Handle close panel
  const handleClosePanel = () => {
    console.log('🗑️ Closing conversation');
    conversationRef.current?.destroy();
    conversationRef.current = null;
    orchestratorRef.current = null;
    setShowPanel(false);
    setElevenLabsReady(false);
  };

  return (
    <>
      {/* Conversation Panel */}
      {showPanel && (
        <ConversationPanel
          messages={messages}
          isListening={isListening}
          isAgentSpeaking={isAgentSpeaking}
          onClose={handleClosePanel}
        />
      )}

      {/* Agent thinking indicator */}
      {agentThinking && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '8px 15px',
          borderRadius: '20px',
          fontSize: '0.9rem',
          zIndex: 1000,
        }}>
          xAI is analyzing...
        </div>
      )}

      {/* Manual Controls (for debugging) */}
      {showManualControls && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
        }}>
          <div>Stage: {stage}</div>
          <div>Eye: {currentEye}</div>
          <div>AI Active: {isAIActive ? 'Yes' : 'No'}</div>
          <div>Line: {orchestratorRef.current?.getState().currentLine}</div>
          <button onClick={() => executeManualAction('advance')}>Advance</button>
          <button onClick={() => executeManualAction('complete')}>Complete</button>
        </div>
      )}
    </>
  );
}

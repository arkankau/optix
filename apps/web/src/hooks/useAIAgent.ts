import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTestStore } from '../store/testStore';
import { api } from '../api/client';

interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

/**
 * AI Agent Hook - Provides agentic control over the exam
 * Uses xAI Grok for function calling to directly control UI
 */
export function useAIAgent() {
  const navigate = useNavigate();
  const testStore = useTestStore();
  const [isAgentActive, setIsAgentActive] = useState(false);
  const [agentThinking, setAgentThinking] = useState(false);

  // Define available tools the AI agent can use
  // Memoized to prevent recreating on every render
  const tools: AgentTool[] = useMemo(() => [
    {
      name: 'navigate_to_stage',
      description: 'Navigate to a specific exam stage',
      parameters: {
        type: 'object',
        properties: {
          stage: {
            type: 'string',
            enum: ['calibration', 'sphere', 'jcc', 'summary'],
            description: 'The stage to navigate to',
          },
        },
        required: ['stage'],
      },
      execute: async ({ stage }) => {
        const routes: Record<string, string> = {
          calibration: '/calibration',
          sphere: '/sphere',
          jcc: '/jcc',
          summary: '/summary',
        };
        
        // Update store stage BEFORE navigating
        console.log(`🎯 Updating stage from ${testStore.stage} to ${stage}`);
        testStore.setStage(stage as any);
        
        // Then navigate
        console.log(`🧭 Navigating to ${routes[stage]}`);
        navigate(routes[stage]);
        
        return { success: true, message: `Navigated to ${stage}` };
      },
    },
    {
      name: 'set_calibration',
      description: 'Set screen calibration values automatically',
      parameters: {
        type: 'object',
        properties: {
          cardWidthPx: {
            type: 'number',
            description: 'Credit card width in pixels (typically 300-350)',
          },
          viewingDistanceCm: {
            type: 'number',
            description: 'Viewing distance in centimeters (typically 60)',
          },
        },
        required: ['cardWidthPx', 'viewingDistanceCm'],
      },
      execute: async ({ cardWidthPx, viewingDistanceCm }) => {
        const cardWidthCm = 8.56; // Standard credit card width
        const pixelsPerCm = cardWidthPx / cardWidthCm;
        const arcminRad = (1 / 60) * (Math.PI / 180);
        const arcminCm = Math.tan(arcminRad) * viewingDistanceCm;
        const pixelsPerArcmin = arcminCm * pixelsPerCm;

        testStore.setCalibration({
          pixelsPerCm,
          viewingDistanceCm,
          pixelsPerArcmin,
          cardWidthPx,
        });

        console.log('🤖 Agent set calibration:', {
          cardWidthPx,
          viewingDistanceCm,
          pixelsPerCm: pixelsPerCm.toFixed(2),
        });

        return {
          success: true,
          message: 'Calibration set',
          data: { pixelsPerCm, viewingDistanceCm },
        };
      },
    },
    {
      name: 'start_eye_test',
      description: 'Start sphere test for a specific eye',
      parameters: {
        type: 'object',
        properties: {
          eye: {
            type: 'string',
            enum: ['OD', 'OS'],
            description: 'Which eye to test (OD=right, OS=left)',
          },
        },
        required: ['eye'],
      },
      execute: async ({ eye }) => {
        testStore.setCurrentEye(eye);
        testStore.setStage(eye === 'OD' ? 'sphere_od' : 'sphere_os');
        return { success: true, message: `Started ${eye} test` };
      },
    },
    {
      name: 'record_sphere_result',
      description: 'Record sphere test results for an eye',
      parameters: {
        type: 'object',
        properties: {
          eye: {
            type: 'string',
            enum: ['OD', 'OS'],
          },
          bestLine: {
            type: 'number',
            description: 'Best line read on Snellen chart (1-11)',
          },
        },
        required: ['eye', 'bestLine'],
      },
      execute: async ({ eye, bestLine }) => {
        // Convert line to sphere value
        const lineToLogMAR = (line: number): number => {
          const map: Record<number, number> = {
            1: 1.0, 2: 0.7, 3: 0.54, 4: 0.4, 5: 0.3,
            6: 0.18, 7: 0.1, 8: 0.0, 9: -0.1, 10: -0.2, 11: -0.3,
          };
          return map[line] || 0.0;
        };

        const lineToSphere = (line: number): number => {
          const logMAR = lineToLogMAR(line);
          if (logMAR <= 0) return 0.0;
          return Math.round((logMAR * -1.5) / 0.25) * 0.25;
        };

        const threshold = lineToLogMAR(bestLine);
        const sphere = lineToSphere(bestLine);

        testStore.setSphereResult(eye, {
          threshold,
          sphere,
          confidence: 0.85,
        });

        console.log(`🤖 Agent recorded ${eye} sphere: ${sphere}D (line ${bestLine})`);

        return {
          success: true,
          message: `Recorded ${eye} sphere result`,
          data: { sphere, threshold, bestLine },
        };
      },
    },
    {
      name: 'complete_calibration',
      description: 'Mark calibration as complete and proceed to testing',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        testStore.setStage('sphere_od');
        navigate('/sphere');
        return { success: true, message: 'Calibration complete, moving to sphere test' };
      },
    },
    {
      name: 'complete_sphere_test',
      description: 'Mark current sphere test as complete',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        const currentEye = testStore.currentEye;
        if (currentEye === 'OD') {
          testStore.setCurrentEye('OS');
          testStore.setStage('sphere_os');
          return { success: true, message: 'OD complete, switching to OS' };
        } else {
          testStore.setStage('jcc_od');
          navigate('/jcc');
          return { success: true, message: 'Both eyes complete, moving to astigmatism' };
        }
      },
    },
    {
      name: 'complete_astigmatism_test',
      description: 'Mark astigmatism test as complete and show results',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        testStore.setStage('summary');
        navigate('/summary');
        return { success: true, message: 'Exam complete, showing summary' };
      },
    },
    {
      name: 'get_current_state',
      description: 'Get current exam state to understand where the patient is',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        return {
          success: true,
          data: {
            stage: testStore.stage,
            currentEye: testStore.currentEye,
            hasCalibration: !!testStore.calibration,
            sessionId: testStore.sessionId,
            sphereResults: {
              OD: testStore.sphereResults.OD,
              OS: testStore.sphereResults.OS,
            },
          },
        };
      },
    },
  ], [navigate, testStore]); // Memoize with stable dependencies

  /**
   * Process AI message and execute any tool calls
   */
  const processAIMessage = useCallback(async (message: string, isUser: boolean) => {
    console.log('🔍 processAIMessage called:', { message: message.substring(0, 50) + '...', isUser, isAgentActive });
    
    if (isUser) {
      console.log('⏭️  Skipping: User message');
      return;
    }
    
    if (!isAgentActive) {
      console.log('⏭️  Skipping: Agent not active');
      return;
    }

    console.log('🤖 AI Agent processing message:', message);
    console.log('📊 Current state:', { stage: testStore.stage, eye: testStore.currentEye });

    // Simple pattern matching (fallback for now, will use Grok later)
    try {
      setAgentThinking(true);
      console.log('🧠 Using simple pattern matching...');

      const msg = message.toLowerCase();
      const toolsToCall: Array<{name: string, parameters: any}> = [];

      // Pattern matching based on message and current stage
      console.log('🔍 Analyzing message:', msg);
      console.log('🔍 Current stage:', testStore.stage);

      // Starting examination or calibration (only when idle)
      if (testStore.stage === 'idle' && 
          (msg.includes('starting') || msg.includes('let me calibrate') || msg.includes('calibrate your screen'))) {
        console.log('✅ Detected: Starting calibration');
        toolsToCall.push({ name: 'navigate_to_stage', parameters: { stage: 'calibration' } });
      }
      
      // Calibration complete, moving to testing
      // ONLY trigger when AI explicitly confirms calibration is done AND wants to move forward
      if (testStore.stage === 'calibration' && 
          ((msg.includes('calibration is complete') || 
            msg.includes('calibration is done') ||
            msg.includes('calibration looks good') ||
            msg.includes('perfect, now') ||
            msg.includes('great, now') ||
            msg.includes('excellent, now') ||
            (msg.includes('calibrated') && (msg.includes("let's") || msg.includes('now'))) ||
            msg.includes('begin testing') || 
            msg.includes('start testing') ||
            (msg.includes("let's test") && msg.includes('right'))))) {
        console.log('✅ Detected: Calibration complete');
        toolsToCall.push({ name: 'complete_calibration', parameters: {} });
      }
      
      // Right eye test complete - ONLY when explicitly saying it's done/complete/finished
      if (testStore.stage === 'sphere_od' && 
          ((msg.includes('right eye is complete') || 
            msg.includes('right eye test is done') ||
            msg.includes('right eye is done') ||
            msg.includes('od is complete') ||
            msg.includes('od test is done') ||
            msg.includes('finished testing right eye') ||
            msg.includes('finished with right eye') ||
            msg.includes('completed right eye') ||
            (msg.includes('right eye') && msg.includes('finished'))))) {
        console.log('✅ Detected: Right eye complete');
        toolsToCall.push({ name: 'record_sphere_result', parameters: { eye: 'OD', bestLine: 8 } });
        toolsToCall.push({ name: 'complete_sphere_test', parameters: {} });
      }
      
      // Left eye test complete - ONLY when explicitly saying it's done/complete/finished
      if (testStore.stage === 'sphere_os' && 
          ((msg.includes('left eye is complete') || 
            msg.includes('left eye test is done') ||
            msg.includes('left eye is done') ||
            msg.includes('os is complete') ||
            msg.includes('os test is done') ||
            msg.includes('finished testing left eye') ||
            msg.includes('finished with left eye') ||
            msg.includes('completed left eye') ||
            (msg.includes('left eye') && msg.includes('finished'))))) {
        console.log('✅ Detected: Left eye complete');
        toolsToCall.push({ name: 'record_sphere_result', parameters: { eye: 'OS', bestLine: 8 } });
        toolsToCall.push({ name: 'complete_sphere_test', parameters: {} });
      }
      
      // Astigmatism test complete
      if ((testStore.stage === 'jcc_od' || testStore.stage === 'jcc_os') && 
          (msg.includes('astigmatism') && (msg.includes('complete') || msg.includes('done') || msg.includes('perfect')))) {
        console.log('✅ Detected: Astigmatism complete');
        toolsToCall.push({ name: 'complete_astigmatism_test', parameters: {} });
      }

      // Execute tools
      if (toolsToCall.length > 0) {
        console.log(`✅ Found ${toolsToCall.length} tool(s) to execute:`, toolsToCall.map(t => t.name));
        for (const toolCall of toolsToCall) {
          const tool = tools.find(t => t.name === toolCall.name);
          if (tool) {
            console.log(`🔧 Executing tool: ${tool.name}`, toolCall.parameters);
            await tool.execute(toolCall.parameters);
            console.log(`✅ Tool executed: ${tool.name}`);
          } else {
            console.warn(`⚠️ Tool not found: ${toolCall.name}`);
          }
        }
      } else {
        console.log('ℹ️ No matching patterns found in message');
      }
    } catch (error) {
      console.error('❌ AI Agent error:', error);
    } finally {
      setAgentThinking(false);
    }
  }, [isAgentActive, testStore, tools, navigate]);

  /**
   * Auto-progress based on state changes
   */
  useEffect(() => {
    if (!isAgentActive) return;

    const autoProgress = async () => {
      // Auto-progress logic based on current state
      const { stage, calibration, currentEye, sphereResults } = testStore;

      // Example: Auto-start sphere test after calibration
      if (stage === 'calibration' && calibration) {
        console.log('🤖 Agent: Calibration detected, ready to progress');
      }

      // Example: Auto-switch to OS after OD complete
      if (stage === 'sphere_od' && sphereResults.OD && currentEye === 'OD') {
        console.log('🤖 Agent: OD complete, ready to test OS');
      }
    };

    autoProgress();
  }, [testStore.stage, testStore.calibration, testStore.sphereResults, isAgentActive]);

  const startAgent = useCallback(() => {
    console.log('🚀 Starting AI Agent...');
    setIsAgentActive(true);
    console.log('✅ AI Agent started - isAgentActive = true');
  }, []);

  const stopAgent = useCallback(() => {
    console.log('🛑 Stopping AI Agent...');
    setIsAgentActive(false);
  }, []);

  return {
    isAgentActive,
    agentThinking,
    startAgent,
    stopAgent,
    processAIMessage,
    tools,
  };
}


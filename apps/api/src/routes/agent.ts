import { Router } from 'express';
import axios from 'axios';

const router = Router();

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';
const XAI_API_KEY = process.env.XAI_GROK_API_KEY;

/**
 * Agent decision endpoint - uses Grok to decide which tools to call
 */
router.post('/decide', async (req, res) => {
  try {
    const { message, currentState, availableTools } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('🤖 AGENT DECISION REQUEST');
    console.log('='.repeat(60));
    console.log('📝 Message:', message);
    console.log('📊 Current State:', JSON.stringify(currentState, null, 2));
    console.log('🔧 Available Tools:', availableTools.length);

    // Build system prompt for Grok
    const systemPrompt = `You are an AI eye examination agent with direct control over the examination app.

Your role is to analyze the current state and the AI examiner's message, then decide which tools to call to progress the examination.

Current State:
- Stage: ${currentState.stage}
- Current Eye: ${currentState.currentEye || 'N/A'}
- Calibration: ${currentState.hasCalibration ? 'Complete' : 'Not started'}

Available Tools:
${availableTools.map((t: any) => `- ${t.name}: ${t.description}`).join('\n')}

Rules:
1. If the message indicates calibration is ready, call 'complete_calibration'
2. If the message indicates a sphere test is complete, call 'complete_sphere_test'
3. If the message indicates astigmatism test is complete, call 'complete_astigmatism_test'
4. If the message mentions specific values (like "line 8" or "60 centimeters"), extract and use them
5. Always progress the examination forward - never go backwards
6. Be proactive - if the AI says "Let's move on", take action

Analyze the message and return the tools you want to call.`;

    // Call Grok with function calling
    const response = await axios.post(
      XAI_API_URL,
      {
        model: 'grok-beta',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `AI Examiner said: "${message}"\n\nWhat tools should I call to progress the exam?`,
          },
        ],
        tools: availableTools.map((tool: any) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        })),
        tool_choice: 'auto',
        temperature: 0.3, // Lower temperature for more deterministic decisions
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${XAI_API_KEY}`,
        },
      }
    );

    const aiResponse = response.data.choices[0].message;
    const toolCalls: any[] = [];

    // Extract tool calls from Grok's response
    if (aiResponse.tool_calls) {
      for (const call of aiResponse.tool_calls) {
        toolCalls.push({
          name: call.function.name,
          parameters: JSON.parse(call.function.arguments),
        });
      }
    }

    console.log('✅ GROK RESPONSE:');
    console.log('🔧 Tools to call:', toolCalls.map(t => t.name).join(', ') || 'NONE');
    console.log('💭 Reasoning:', aiResponse.content || 'No reasoning');
    console.log('='.repeat(60) + '\n');

    res.json({
      success: true,
      toolCalls,
      reasoning: aiResponse.content || 'No reasoning provided',
    });
  } catch (error: any) {
    console.error('\n' + '❌ AGENT ERROR:');
    console.error('Error details:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('='.repeat(60) + '\n');
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data,
      toolCalls: [], // Return empty on error to fail gracefully
    });
  }
});

/**
 * Simpler pattern-based decision (fallback if Grok fails)
 */
router.post('/decide-simple', async (req, res) => {
  try {
    const { message, currentState } = req.body;
    const toolCalls: any[] = [];

    const msg = message.toLowerCase();

    // Pattern matching for common scenarios
    if (msg.includes('calibration') && msg.includes('complete')) {
      toolCalls.push({ name: 'complete_calibration', parameters: {} });
    }

    if (msg.includes('right eye') && msg.includes('complete')) {
      toolCalls.push({ name: 'complete_sphere_test', parameters: {} });
    }

    if (msg.includes('left eye') && msg.includes('complete')) {
      toolCalls.push({ name: 'complete_sphere_test', parameters: {} });
    }

    if (msg.includes('astigmatism') && msg.includes('complete')) {
      toolCalls.push({ name: 'complete_astigmatism_test', parameters: {} });
    }

    // Extract viewing distance
    const distanceMatch = msg.match(/(\d+)\s*(cm|centimeters)/i);
    if (distanceMatch && currentState.stage === 'calibration') {
      const distance = parseInt(distanceMatch[1]);
      toolCalls.push({
        name: 'set_calibration',
        parameters: {
          cardWidthPx: 320, // Default reasonable value
          viewingDistanceCm: distance,
        },
      });
    }

    // Extract line number
    const lineMatch = msg.match(/line\s*(\d+)/i);
    if (lineMatch && currentState.stage.includes('sphere')) {
      const line = parseInt(lineMatch[1]);
      toolCalls.push({
        name: 'record_sphere_result',
        parameters: {
          eye: currentState.currentEye || 'OD',
          bestLine: line,
        },
      });
    }

    console.log('🔧 Simple pattern matching decided:', toolCalls.map(t => t.name).join(', '));

    res.json({
      success: true,
      toolCalls,
      reasoning: 'Pattern-based decision',
    });
  } catch (error: any) {
    console.error('Simple agent decision error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      toolCalls: [],
    });
  }
});

export default router;


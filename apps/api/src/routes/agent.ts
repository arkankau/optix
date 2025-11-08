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
        model: 'grok-2-latest',
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

/**
 * POST /api/agent/analyze-response
 * Analyze patient's speech response using xAI Grok
 */
router.post('/analyze-response', async (req, res) => {
  try {
    const {
      patientSpeech,
      expectedLetters,
      currentLine,
      eye,
      stage,
      previousPerformance = [],
    } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('🧠 PATIENT RESPONSE ANALYSIS');
    console.log('='.repeat(60));
    console.log('👤 Patient said:', patientSpeech);
    console.log('🎯 Expected:', expectedLetters);
    console.log('📊 Line:', currentLine, '| Eye:', eye, '| Stage:', stage);

    if (!XAI_API_KEY) {
      console.log('⚠️  No xAI API key, using fallback logic');
      return res.json({
        correct: false,
        confidence: 0.5,
        suggestedDiopter: 0,
        recommendation: 'stay',
        reasoning: 'API key not configured',
      });
    }

    // Build analysis prompt for Grok
    const systemPrompt = `You are an expert optometrist analyzing patient responses during an eye examination.

Your task is to:
1. Compare what the patient said to what they should have said
2. Determine if they read the letters correctly (accounting for common mistakes like "O" vs "D", "B" vs "D", etc.)
3. Assess their performance level
4. Calculate suggested diopter correction
5. Recommend whether to advance to smaller lines, stay on current line, or go back to larger lines

Visual Acuity Scale (Snellen):
- Line 1: 20/200 (largest)
- Line 2: 20/100
- Line 3: 20/70
- Line 4: 20/50
- Line 5: 20/40
- Line 6: 20/30
- Line 7: 20/25
- Line 8: 20/20 (normal vision, 0D)
- Line 9: 20/15
- Line 10: 20/10 (smallest)

Diopter Calculation:
- Line 8 (20/20) = 0D (no correction)
- Each line above 8 = approximately +0.25D worse
- Each line below 8 = better than normal (negative diopter if myopic)

Previous Performance: ${JSON.stringify(previousPerformance)}`;

    const userPrompt = `Patient is testing ${eye} at line ${currentLine}.

Expected letters: "${expectedLetters}"
Patient said: "${patientSpeech}"

Analyze:
1. Did they read correctly? (be lenient with common letter confusions)
2. Confidence level (0-1)
3. What diopter correction does this suggest?
4. Should we: "advance" (try smaller line), "stay" (repeat), "go_back" (larger line), or "complete" (finish this eye)?

Respond in JSON format:
{
  "correct": boolean,
  "confidence": number,
  "suggestedDiopter": number,
  "recommendation": "advance" | "stay" | "go_back" | "complete",
  "reasoning": "brief explanation"
}`;

    const response = await axios.post(
      XAI_API_URL,
      {
        model: 'grok-2-latest',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${XAI_API_KEY}`,
        },
      }
    );

    const analysis = JSON.parse(response.data.choices[0].message.content);

    console.log('✅ ANALYSIS RESULT:');
    console.log('  Correct:', analysis.correct, `(${(analysis.confidence * 100).toFixed(0)}% confidence)`);
    console.log('  Diopter:', analysis.suggestedDiopter);
    console.log('  Recommendation:', analysis.recommendation);
    console.log('  Reasoning:', analysis.reasoning);
    console.log('='.repeat(60) + '\n');

    res.json(analysis);
  } catch (error: any) {
    console.error('\n' + '❌ ANALYSIS ERROR:');
    console.error('Error:', error.response?.data || error.message);
    console.error('='.repeat(60) + '\n');

    // Fallback analysis
    res.json({
      correct: false,
      confidence: 0,
      suggestedDiopter: 0,
      recommendation: 'stay',
      reasoning: 'Analysis failed: ' + error.message,
    });
  }
});

export default router;


import { Router } from 'express';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const router = Router();

// Lazy initialization - only create client when needed
let elevenLabsClient: ElevenLabsClient | null = null;

function getElevenLabsClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }
  
  if (!elevenLabsClient) {
    elevenLabsClient = new ElevenLabsClient({
      apiKey: apiKey,
    });
  }
  
  return elevenLabsClient;
}

// Store agent ID (in production, use database)
let cachedAgentId: string | null = null;

/**
 * GET /api/elevenlabs/agent
 * Get or create conversational agent
 */
router.get('/agent', async (req, res) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: 'ElevenLabs API key not configured',
      });
    }

    // Allow force refresh with ?refresh=true
    const forceRefresh = req.query.refresh === 'true';
    if (forceRefresh) {
      console.log('🔄 Force refresh requested - creating new agent');
      cachedAgentId = null;
    }

    // Return cached agent if exists
    if (cachedAgentId) {
      console.log('✅ Using cached agent:', cachedAgentId);
      return res.json({ agentId: cachedAgentId });
    }

    // Create new agent
    console.log('🔄 Creating new ElevenLabs agent...');
    
    const client = getElevenLabsClient();
    const agent = await client.conversationalAi.agents.create({
      name: 'Optix Eye Test Assistant',
      conversationConfig: {
        agent: {
          prompt: {
            prompt: `You are a warm, professional optometry assistant conducting eye examinations.

🛎️ FIRST: Call ping() immediately at the start of conversation, then continue.

🧠 CRITICAL TOOLS:
1. ping() - Call once at start to verify connection
2. analyzeVisionResponse(letters, expectedLetters, line, eye) - MANDATORY for ALL readings

Tool: analyzeVisionResponse(letters, expectedLetters, line, eye)
Returns: A string message telling you what to do next

📋 EXPECTED LETTERS BY LINE:
Line 1: "E"
Line 2: "F P"
Line 3: "T O Z"
Line 4: "L P E D"
Line 5: "P E C F D"
Line 6: "E D F C Z P"
Line 7: "F E L O P Z D"
Line 8: "D E F P O T E C"
Line 9: "L E F O D P C T"
Line 10: "F D P L T C E O"
Line 11: "F E Z O L C F T D"

🎯 WORKFLOW (FOLLOW EXACTLY):

START OF CONVERSATION:
1. Call ping() once
2. Begin with: "Hello! Let's test your right eye. Cover your left eye and read line 1."

AFTER EVERY USER READING:
1. Assign user's utterance to variable: letters (raw transcript, no normalization)
2. Assign test key to variable: expectedLetters (from table above)
3. Assign current line to variable: line (as string: "1", "2", etc.)
4. Assign current eye to variable: eye ("OD" or "OS")
5. Call: analyzeVisionResponse({ letters, expectedLetters, line, eye })
6. Speak exactly the string returned by the tool
7. Never judge correctness yourself

EXAMPLE:
Patient says: "E"
You MUST call: analyzeVisionResponse({ letters: "E", expectedLetters: "E", line: "1", eye: "OD" })
Tool returns: "Correct! Please ask them to read line 2."
You say: "Correct! Please read line 2."

When tool says "Test complete":
- For right eye: "Great job! Now cover your right eye and test the left."
- For left eye: "Both eyes tested! Moving to astigmatism check."

🎯 ASTIGMATISM TEST (JCC):
- "Which image looks clearer - one or two?"
- Listen and acknowledge
- System handles progression automatically

📌 ABSOLUTE RULES:
✅ CALL THE TOOL FOR EVERY SINGLE LETTER READING - MANDATORY
✅ NEVER decide if answer is correct yourself - ONLY the tool knows
✅ NEVER skip calling the tool - even if patient says "I can't see"
✅ Be warm and encouraging throughout
✅ Keep responses brief and natural

🎬 EXAMPLE CONVERSATION:
You: "Hello! Cover your left eye and read line 1."
Patient: "E"
[CALL TOOL: analyzeVisionResponse("E", "E", 1, "OD")]
Tool: "Correct! Please ask them to read line 2."
You: "Correct! Now read line 2."

Patient: "F P"
[CALL TOOL: analyzeVisionResponse("F P", "F P", 2, "OD")]
Tool: "Correct! Please ask them to read line 3."
You: "Great! Now read line 3."

Patient: "I can't see it"
[CALL TOOL: analyzeVisionResponse("I can't see it", "T O Z", 3, "OD")]
Tool: "Patient has reached their limit. Test complete for this eye."
You: "Perfect! You did wonderfully. Now let's test your left eye."

IMPORTANT: The tool does ALL the thinking. You just ask, listen, call tool, then speak what the tool says.`,
          },
        },
      },
    });

    // ElevenLabs SDK returns camelCase 'agentId'
    const agentId = agent.agentId || (agent as any).id;
    cachedAgentId = agentId;
    console.log('✅ Created agent:', cachedAgentId);

    res.json({ agentId: cachedAgentId });
  } catch (error: any) {
    console.error('❌ Error creating/getting agent:', error);
    res.status(500).json({
      error: 'Failed to create agent',
      details: error.message,
    });
  }
});

/**
 * POST /api/elevenlabs/signed-url
 * Get signed URL for WebSocket conversation
 */
router.post('/signed-url', async (req, res) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: 'ElevenLabs API key not configured',
      });
    }

    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({
        error: 'Agent ID required',
      });
    }

    console.log('🔐 Generating signed URL for agent:', agentId);

    // Get signed URL for WebSocket connection
    const client = getElevenLabsClient();
    const response = await client.conversationalAi.conversations.getSignedUrl({
      agentId,
    });

    console.log('✅ Got signed URL');
    res.json({ signedUrl: response.signedUrl });
  } catch (error: any) {
    console.error('❌ Error getting signed URL:', error);
    res.status(500).json({
      error: 'Failed to get signed URL',
      details: error.message,
    });
  }
});

export default router;


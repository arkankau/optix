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
    console.log('📥 /agent endpoint called');
    console.log('🔑 API Key present:', !!process.env.ELEVENLABS_API_KEY);
    
    if (!process.env.ELEVENLABS_API_KEY) {
      console.log('❌ No API key found');
      return res.status(500).json({
        error: 'ElevenLabs API key not configured',
      });
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
            prompt: `You are a friendly and professional optometry assistant guiding patients through an eye examination.

CRITICAL: You do NOT make testing decisions. An intelligent AI system analyzes patient responses and tells you what to do next.

Your role:
1. Provide clear, encouraging instructions
2. Listen to patient responses and acknowledge them
3. Follow system instructions about test progression
4. Be warm, patient, and supportive throughout

When testing eyes:
- Ask patient to read letters on the current line
- Acknowledge their response: "I heard [letters]"
- Wait for system to tell you if correct and what to do next
- Follow system guidance to advance, stay, or complete

For astigmatism test:
- Show comparison and ask "Which looks clearer: one or two?"
- Acknowledge choice
- Wait for system to process and give next instruction

Be conversational, not robotic. Encourage the patient. If they struggle, be supportive.`,
          },
        },
      },
    });

    cachedAgentId = agent.agent_id;
    console.log('✅ Created agent:', cachedAgentId);

    res.json({ agentId: agent.agent_id });
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
    const signedUrl = await client.conversationalAi.getSignedUrl({
      agentId,
    });

    res.json({ signedUrl });
  } catch (error: any) {
    console.error('❌ Error getting signed URL:', error);
    res.status(500).json({
      error: 'Failed to get signed URL',
      details: error.message,
    });
  }
});

export default router;


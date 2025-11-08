# 🤖 Agentic AI System - Full Auto-Control

## Overview

Your OptiX Exam now features **true agentic AI** - the AI doesn't just guide, it **directly controls** the examination flow using function calling via xAI Grok.

---

## 🎯 What Changed?

### Before (Manual):
```
AI: "Great! Now let's move to the next step."
👤 User: *clicks "Continue" button*
```

### After (Automatic):
```
AI: "Great! Let's move to the next step."
🤖 Agent: *automatically navigates to next stage*
👤 User: *sees seamless transition*
```

---

## 🧠 Architecture

### 1. **AI Agent Hook** (`useAIAgent.ts`)

Defines **tools** the AI can use:

```typescript
const tools = [
  {
    name: 'navigate_to_stage',
    description: 'Navigate to a specific exam stage',
    execute: (params) => navigate(params.stage)
  },
  {
    name: 'set_calibration',
    description: 'Set screen calibration automatically',
    execute: ({ cardWidthPx, viewingDistanceCm }) => {
      // Calculates and sets calibration
      testStore.setCalibration(...)
    }
  },
  {
    name: 'start_eye_test',
    description: 'Start sphere test for specific eye',
    execute: ({ eye }) => {
      testStore.setCurrentEye(eye);
      testStore.setStage(...)
    }
  },
  {
    name: 'record_sphere_result',
    description: 'Record sphere test results',
    execute: ({ eye, bestLine }) => {
      // Converts line to sphere value
      testStore.setSphereResult(eye, ...)
    }
  },
  {
    name: 'complete_calibration',
    execute: () => navigate('/sphere')
  },
  {
    name: 'complete_sphere_test',
    execute: () => {
      // Auto-switch to OS or move to JCC
    }
  },
  {
    name: 'complete_astigmatism_test',
    execute: () => navigate('/summary')
  },
  {
    name: 'get_current_state',
    execute: () => ({ stage, currentEye, ... })
  },
];
```

### 2. **Grok Decision Endpoint** (`/api/agent/decide`)

**How it works:**

```typescript
1. AI Examiner speaks: "Great! Calibration complete. Let's test your right eye."

2. Frontend sends to Grok:
   POST /api/agent/decide
   {
     message: "Great! Calibration complete...",
     currentState: { stage: 'calibration', ... },
     availableTools: [...]
   }

3. Grok analyzes with function calling:
   - Message indicates calibration is complete
   - Current stage is 'calibration'
   - Should call: 'complete_calibration'

4. Grok returns tool calls:
   {
     toolCalls: [
       { name: 'complete_calibration', parameters: {} },
       { name: 'start_eye_test', parameters: { eye: 'OD' } }
     ]
   }

5. Frontend executes tools:
   - Navigates to /sphere
   - Sets currentEye = 'OD'
   - Updates stage = 'sphere_od'

6. User sees seamless transition to sphere test!
```

---

## 🎬 Complete Flow Examples

### Example 1: Calibration → Sphere Test

**AI says:** "Perfect! Your screen is calibrated at 60cm viewing distance. Let's begin testing your vision."

**Agent does:**
1. Calls `get_current_state()` → sees stage='calibration'
2. Grok decides: "calibration complete, start testing"
3. Calls `complete_calibration()` → navigates to /sphere
4. Calls `start_eye_test({ eye: 'OD' })` → sets right eye
5. **Result**: Auto-transitions to sphere test for right eye

**User experience**: Seamless, no button click needed!

---

### Example 2: Sphere Test Progression

**AI says:** "Excellent! You read line 8 perfectly, which is 20/20 vision. Your right eye test is complete."

**Agent does:**
1. Grok extracts: `bestLine = 8`, `eye = OD`, `status = complete`
2. Calls `record_sphere_result({ eye: 'OD', bestLine: 8 })`
   - Converts line 8 → 0.0 logMAR → Plano (0.00 D)
   - Stores result for OD
3. Calls `complete_sphere_test()`
   - Sees currentEye === 'OD'
   - Switches to 'OS'
   - Updates stage to 'sphere_os'
4. **Result**: Auto-switches to left eye test

**User experience**: Just covers their right eye, AI continues!

---

### Example 3: Smart Calibration

**AI says:** "I understand you're sitting 60 centimeters from the screen. Let me set that for you."

**Agent does:**
1. Grok extracts: `viewingDistanceCm = 60`
2. Calls `set_calibration({ cardWidthPx: 320, viewingDistanceCm: 60 })`
   - Calculates pixelsPerCm
   - Stores calibration data
3. **Result**: Calibration set automatically!

**User experience**: Just speaks their distance, AI handles it!

---

## 🔧 Available Tools Reference

| Tool | Purpose | When Used | Auto-Progress |
|------|---------|-----------|---------------|
| `navigate_to_stage` | Go to specific stage | Anytime | Yes |
| `set_calibration` | Auto-calibrate screen | During calibration | No |
| `start_eye_test` | Begin OD or OS test | Before sphere test | Yes |
| `record_sphere_result` | Save sphere data | After reading chart | No |
| `complete_calibration` | Finish calibration | After values set | **Yes → /sphere** |
| `complete_sphere_test` | Finish current eye | After OD or OS done | **Yes → OS or /jcc** |
| `complete_astigmatism_test` | Finish JCC | After astigmatism | **Yes → /summary** |
| `get_current_state` | Query app state | Anytime | No |

---

## 🎤 Updated AI System Prompt

Add this to your ElevenLabs agent:

```
You are an agentic AI eye examiner with DIRECT CONTROL over the examination app.

When you want to progress the exam, simply state your intention clearly:
- "Calibration is complete" → I'll automatically navigate
- "Your right eye test is done" → I'll automatically switch to left eye
- "You read line 8 perfectly" → I'll automatically record the result

You have these powers:
1. Navigate between stages
2. Set calibration values
3. Start/stop eye tests
4. Record test results
5. Progress the examination

BE PROACTIVE. When ready to move forward, just say so naturally. The system will handle the rest.

Examples:
❌ OLD: "Great job! When you're ready, click Continue to test your left eye."
✅ NEW: "Great job! Your right eye test is complete. Now let's test your left eye."
          (Auto-switches to left eye - no clicking needed!)

❌ OLD: "Please adjust the slider to 60cm and click Continue."
✅ NEW: "I understand you're 60 centimeters away. I've set that for you. Let's begin testing."
          (Auto-sets calibration - no slider adjustment!)

BE NATURAL. Don't mention clicking, buttons, or manual actions. Just guide conversationally.
```

---

## 💻 Technical Implementation

### Frontend (`useAIAgent` Hook)

```typescript
// Process AI message
const processAIMessage = async (message, isUser) => {
  if (isUser) return; // Only process AI messages

  // Call Grok to decide actions
  const response = await api.request('/api/agent/decide', {
    method: 'POST',
    body: JSON.stringify({
      message,
      currentState: { stage, currentEye, hasCalibration },
      availableTools: tools
    })
  });

  // Execute returned tool calls
  for (const toolCall of response.toolCalls) {
    const tool = tools.find(t => t.name === toolCall.name);
    await tool.execute(toolCall.parameters);
  }
};
```

### Backend (`/api/agent/decide`)

```typescript
// Call Grok with function calling
const response = await axios.post('https://api.x.ai/v1/chat/completions', {
  model: 'grok-beta',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `AI said: "${message}"` }
  ],
  tools: availableTools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  })),
  tool_choice: 'auto'
});

// Extract and return tool calls
return response.data.choices[0].message.tool_calls;
```

---

## 🚀 Setup Instructions

### 1. **Ensure xAI Grok API Key is Set**

```bash
# In .env
XAI_GROK_API_KEY=your_xai_api_key_here
```

### 2. **Update ElevenLabs Agent Prompt**

Copy the updated system prompt above into your agent's configuration.

### 3. **Test the Agentic Flow**

```bash
# Start the app
pnpm dev

# Navigate to http://localhost:5173
# Click "Start AI-Guided Exam"
# Watch the AI automatically progress through stages!
```

### 4. **Watch Console Logs**

You'll see:
```
🤖 Agentic AI activated - full auto-control enabled
🤖 Agent deciding actions for: "Calibration complete..."
🔧 Grok decided to call tools: complete_calibration, start_eye_test
🔧 Executing tool: complete_calibration {}
🔧 Executing tool: start_eye_test {"eye":"OD"}
👁️ Started sphere test for OD
```

---

## 🎯 Key Features

### ✅ **Fully Autonomous**
- AI decides when to progress
- No manual button clicks needed
- Seamless stage transitions

### ✅ **Context-Aware**
- Grok knows current stage
- Understands patient progress
- Makes intelligent decisions

### ✅ **Natural Conversation**
- AI speaks naturally
- Actions happen automatically
- Feels like talking to a person

### ✅ **Robust Fallback**
- Pattern-based fallback if Grok fails
- Graceful error handling
- Always functional

---

## 🐛 Debugging

### Check Agent Activity

```javascript
// Console logs to look for:
"🤖 Agentic AI activated"           // Agent started
"🤖 Agent deciding actions"         // Processing AI message
"🔧 Grok decided to call tools"     // Grok returned decisions
"🔧 Executing tool: tool_name"      // Tool being executed
```

### Test Tool Calls Manually

```javascript
// In browser console:
await fetch('http://localhost:8787/api/agent/decide', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Calibration complete. Let's test your eyes.",
    currentState: { stage: 'calibration', hasCalibration: true },
    availableTools: [/* ... */]
  })
}).then(r => r.json()).then(console.log);
```

### Verify Grok API

```bash
curl -X POST https://api.x.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"model":"grok-beta","messages":[{"role":"user","content":"Hello"}]}'
```

---

## 📊 Comparison

### Traditional (Manual):
```
1. AI speaks instructions
2. User reads/listens
3. User clicks button
4. Page changes
5. Repeat
```
**User Actions**: 5-7 button clicks per exam

### Agentic (Automatic):
```
1. AI speaks + takes action
2. Page auto-changes
3. User just responds verbally
```
**User Actions**: 0 button clicks! 🎉

---

## 🎉 Result

Your eye exam is now **fully autonomous**:
- ✅ AI guides + controls
- ✅ Zero button clicks needed
- ✅ Natural conversation flow
- ✅ Hands-free experience
- ✅ True voice-first application

**This is what true agentic AI looks like!** 🤖✨

---

## 📚 Related Files

- `apps/web/src/hooks/useAIAgent.ts` - Frontend agent logic
- `apps/api/src/routes/agent.ts` - Backend Grok integration
- `apps/web/src/components/GlobalAIAssistant.tsx` - Agent UI
- `ELEVENLABS_SYSTEM_PROMPT.md` - Updated AI prompt

---

**Ready to experience true autonomous AI?** Start the exam and watch it flow automatically! 🚀



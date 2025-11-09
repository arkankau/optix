# 🔬 Complete Diagnostic Implementation

## ✅ All Fixes Applied

I've implemented EVERY diagnostic step from the ElevenLabs expert:

### 1. **Canary Tool Added** 🛎️
```typescript
ping: async () => {
  console.log('🛎️ ping tool called - tool pipeline is working!');
  return 'Tool pipeline OK. Beginning exam.';
}
```

**What this does**: Tests if ANY tool can be called. If ping fires, the plumbing works!

### 2. **All Params Changed to Strings**
```typescript
analyzeVisionResponse: async (params: {
  letters: string;
  expectedLetters: string;
  line: string;  // ← Now string, not number!
  eye: string;
}) => {
  const lineNum = Number(params.line) || 1; // Coerce to number
  // ...
}
```

**Why**: Avoids schema rejection. The model might send "2", "two", or `2`.

### 3. **Maximum Debug Logging**
```typescript
onDebug: (e) => console.log('[EL debug]', e),
onUnhandledClientToolCall: (call) => {
  console.warn('⚠️ Unhandled client tool:', call?.name, call?.parameters);
},
onMessage: (m) => console.log('💬', JSON.stringify(m)),
```

**What you'll see**:
- Every ElevenLabs event
- Unhandled tool calls (name/param mismatch)
- All messages (user + agent)

### 4. **Connection Type Explicit**
```typescript
await conversation.startSession({
  agentId: finalAgentId,
  connectionType: "webrtc", // Can try "websocket" if this fails
  clientTools: { ping, analyzeVisionResponse }
});
```

### 5. **Agent Prompt Updated**
```
🛎️ FIRST: Call ping() immediately at start

AFTER EVERY USER READING:
1. Assign letters = user's utterance
2. Assign expectedLetters = from table
3. Assign line = "1", "2", etc (STRING!)
4. Assign eye = "OD" or "OS"
5. Call: analyzeVisionResponse({ letters, expectedLetters, line, eye })
6. Speak the returned string
```

---

## 🧪 Test Plan

### Step 1: Dashboard Configuration

**You MUST do this:**

1. Go to **Agents** → **Optix Eye Test Assistant**
2. Click **Tools** tab
3. Add **TWO tools**:

#### Tool 1: ping
```
Name: ping
Type: Client Tool
Parameters: (none)
Wait for response: ON
```

#### Tool 2: analyzeVisionResponse
```
Name: analyzeVisionResponse
Type: Client Tool
Parameters (ALL STRINGS):
  - letters (string, required)
  - expectedLetters (string, required)
  - line (string, required)
  - eye (string, required)
Wait for response: ON
Execution mode: Immediate
Pre-tool speech: OFF
```

3. **Save both tools**
4. **Verify** they show in agent's Tools list

---

### Step 2: Test Sequence

Restart servers and open `http://localhost:5173`

#### Test A: Does Ping Fire?

**Start conversation. Look for:**
```
🛎️ ping tool called - tool pipeline is working!
```

**Result:**
- ✅ **Ping fires** → Tool plumbing works! Problem is with analyzeVisionResponse specifically.
- ❌ **Ping doesn't fire** → Tools aren't attached to agent or session registration failed.

#### Test B: Does analyzeVisionResponse Fire?

**Say "E" when prompted. Look for:**
```
🧠 ClientTool: analyzeVisionResponse called by agent
🧠 Params received: { "letters": "E", "expectedLetters": "E", "line": "1", "eye": "OD" }
✅ xAI Analysis result: {correct: true, ...}
✅ Returning to agent: "Correct! Please ask them to read line 2."
```

**Result:**
- ✅ **Tool fires** → 🎉 **IT'S WORKING! xAI IS NOW INTEGRATED!**
- ❌ **Tool doesn't fire** → See diagnostics below.

---

## 🔍 Diagnostic Results

### If Ping Fires But analyzeVisionResponse Doesn't:

**Look for:**
```
⚠️ Unhandled client tool: analyzeVisionResponse
```

**Problem**: Parameter mismatch

**Fix**:
1. Screenshot your dashboard tool config
2. Verify EXACT names: `letters`, `expectedLetters`, `line`, `eye`
3. Verify ALL are type `string`
4. Verify tool is attached to agent

### If Neither Tool Fires:

**Look for:**
```
[EL debug] {...}
```

**Check**:
1. Agent ID matches: Look for `✅ Got fresh agent ID: agent_XXX`
2. Tools attached to THAT specific agent
3. startSession logs show connection success

### If You See:
```
💬 {"source":"ai","message":"That's correct! Read line two."}
```

**Without any tool logs:**

**Problem**: Agent is NOT calling tools at all

**Possible causes**:
1. Tools not attached to agent in dashboard
2. Different agent ID being used
3. Connection type issue (try `"websocket"` instead of `"webrtc"`)

---

## 📊 Success Criteria

### ✅ **Working System Logs:**

```
🛎️ ping tool called - tool pipeline is working!
💬 {"source":"ai","message":"Tool pipeline OK. Beginning exam..."}
💬 {"source":"user","message":"E"}
🧠 ClientTool: analyzeVisionResponse called by agent
🧠 Params received: {"letters":"E","expectedLetters":"E","line":"1","eye":"OD"}
✅ xAI Analysis result: {correct: true, recommendation: "advance"}
✅ Returning to agent: "Correct! Please ask them to read line 2."
💬 {"source":"ai","message":"Correct! Please read line 2."}
```

### ✅ **UI Behavior:**
- Line advances automatically (1 → 2 → 3...)
- Eye switches automatically (OD → OS)
- Navigation happens automatically (Sphere → JCC)

---

## 🚨 If Nothing Works

**Nuclear Option**: Convert to Server Tool/Webhook

Instead of Client Tool, make it a **Server Tool**:

1. Dashboard: Change `analyzeVisionResponse` to **Server Tool**
2. Webhook URL: `http://localhost:8787/api/xai/analyze`
3. Create backend endpoint:

```typescript
router.post('/xai/analyze', async (req, res) => {
  const { letters, expectedLetters, line, eye } = req.body;
  
  // Call xAI
  const result = await analyzeResponse({...});
  
  // Return string for agent to speak
  res.json({
    text: result.correct 
      ? `Correct! Please ask them to read line ${Number(line) + 1}.`
      : `Incorrect. ${result.recommendation === 'complete' ? 'Test complete.' : 'Try again.'}`
  });
});
```

This bypasses all client registration issues.

---

## 📁 What Was Changed

### Frontend (`GlobalAIAssistant.tsx`):
- ✅ Added `ping` canary tool
- ✅ Changed all params to strings
- ✅ Added comprehensive debug callbacks
- ✅ Explicit `connectionType: "webrtc"`
- ✅ Tool registration at `startSession()`

### Backend (`elevenlabs.ts`):
- ✅ Updated prompt to call `ping()` first
- ✅ Made tool call instructions imperative
- ✅ Added explicit parameter handling examples

---

## ⏱️ Time to Success

**Dashboard setup**: 5 minutes (2 tools)  
**Test**: 1 minute  
**Total**: 6 minutes to know if it works

---

## 🎯 Next Steps

1. **Configure dashboard** (both tools!)
2. **Restart servers** (they're restarting now)
3. **Test with "E"**
4. **Watch for ping log first**
5. **Then watch for analyzeVisionResponse log**
6. **Share results with me!**

We'll know in 10 seconds if the plumbing works (ping), and in 30 seconds if xAI integration works (analyzeVisionResponse)!


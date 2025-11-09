# 🚨 CRITICAL: ElevenLabs Dashboard Setup Required

## ✅ Code Changes Complete

I've implemented all the code fixes:
- ✅ Moved `clientTools` registration to `startSession()` 
- ✅ Added `onDebug` and `onUnhandledClientToolCall` callbacks
- ✅ Added `xai-decision` CustomEvent for deterministic UI progression
- ✅ Improved logging to track tool calls

## 🎯 What YOU Must Do Now (5 Minutes)

The agent won't call the tool until you **register it in the ElevenLabs Dashboard**. This is required!

---

## Step-by-Step Dashboard Setup

### 1. Go to ElevenLabs Dashboard
Navigate to: https://elevenlabs.io/app/conversational-ai

### 2. Find Your Agent
Look for: **"Optix Eye Test Assistant"**

Agent ID from logs: `agent_9801k9kf8wzjegaa5c3mkp4w2fgs`

### 3. Add Client Tool

Click your agent → **Tools** tab → **Add Tool**

Fill in these EXACT values:

#### Tool Configuration:
```
Tool Type: Client Tool (not Server/Webhook!)

Name: analyzeVisionResponse
(EXACT casing - must match code!)

Description:
Call this tool after every patient reading. Do not judge correctness yourself.
Pass the patient's spoken letters + expected letters + line number + eye.
The tool returns the exact phrase you must speak next.

Parameters (all required):
  - letters (string) - What the patient said
  - expectedLetters (string) - Correct letters for this line
  - line (number) - Current line number (1-11)
  - eye (string) - Which eye ("OD" or "OS")

⚠️ CRITICAL: Enable "Wait for response" / "Blocking"
   This makes the agent PAUSE and wait for xAI's analysis before speaking!
```

### 4. Save the Tool

Click **Save** or **Create Tool**

### 5. Verify Tool Shows in Agent

You should see `analyzeVisionResponse` listed under your agent's Tools.

---

## 🧪 Test It Works

### Step 1: Restart the App
```bash
cd /Users/arkanfadhilkautsar/Downloads/eye-test
killall node && sleep 2 && pnpm dev
```

### Step 2: Start Test
1. Open `http://localhost:5173`
2. Click "Start with AI Assistant"
3. Calibrate screen
4. Say "E" when prompted to read line 1

### Step 3: Watch Console for Success Signs

✅ **Tool is being called:**
```
🧠 ClientTool: analyzeVisionResponse called by agent {letters: "E", expectedLetters: "E", line: 1, eye: "OD"}
✅ xAI Analysis result: {correct: true, recommendation: "advance", ...}
✅ Returning to agent: "Correct! Please ask them to read line 2."
```

✅ **UI updates automatically:**
```
Line advances from 1 → 2
Eye switches from OD → OS
Navigation happens to JCC after both eyes
```

---

## 🐛 If Tool STILL Doesn't Fire

### Debug Step 1: Check for Unhandled Tool Call
Look in console for:
```
⚠️ Unhandled client tool call: analyzeVisionResponse {...}
```

This means:
- Tool name or parameters don't match exactly
- Check casing: `analyzeVisionResponse` (camelCase)
- Check param names: `letters`, `expectedLetters`, `line`, `eye` (exact!)

### Debug Step 2: Check ElevenLabs Debug Logs
Look for:
```
[ElevenLabs debug] {...}
```

This shows internal SDK events. Should see `tool_call` events.

### Debug Step 3: Verify Tool in Dashboard
- Tool Type must be **Client Tool** (not Server/Webhook)
- "Wait for response" must be **ENABLED**
- Tool must be **attached to your agent**

---

## 📊 Before vs After

### Before (Broken):
```
Patient: "E"
Agent: "That's correct! Read line two."  ← Agent decided itself!
[NO xAI involved]
[UI stuck]
```

### After (Fixed):
```
Patient: "E"
🧠 ClientTool: analyzeVisionResponse called
✅ xAI Analysis: {correct: true, recommendation: "advance"}
Agent: "Correct! Please ask them to read line 2."  ← From xAI!
[UI advances to line 2]
```

---

## 🎉 Expected Results

Once the dashboard tool is configured, you should see:

1. **Every patient response triggers tool call**
2. **xAI analyzes correctness** (not the agent)
3. **Agent speaks xAI's decision**
4. **UI advances automatically** via `xai-decision` event
5. **Eye switches automatically** (OD → OS)
6. **Navigation happens automatically** (Sphere → JCC)

---

## 📞 If You Need Help

### Common Issues:

**"Unhandled client tool" warning**
→ Name/param mismatch. Check exact spelling in dashboard.

**Agent talks but no tool logs**
→ Tool not configured in dashboard, or "Wait for response" not enabled.

**Tool logs appear but UI doesn't update**
→ Check for errors in the tool function (console.error logs).

**"I need to use my tool..." infinite loop**
→ Tool configured but agent can't access it. Verify it's a **Client Tool** not Server Tool.

---

## ⏱️ This Should Take 5 Minutes

1. Open ElevenLabs Dashboard (1 min)
2. Add Client Tool with exact config (3 min)
3. Restart app and test (1 min)

**Then it will work!** 🚀


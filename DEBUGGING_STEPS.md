# 🔍 Debugging the Agentic System

## Quick Fix - Test Manually

I've added a **"🧪 Test Auto-Progress" button** (bottom-left) that you can click to manually trigger the agentic system at any stage.

## Steps to Debug:

### 1. **Start the Exam**
- Go to http://localhost:5173
- Click "🎤 Start AI-Guided Exam"
- Navigate to Calibration page

### 2. **Click the Green Button (Bottom-Left)**
- You'll see: **"🧪 Test Auto-Progress"**
- Click it to manually trigger the agent
- Watch what happens!

### 3. **Check the Console (F12 / Cmd+Option+I)**

Look for these logs:

```
✅ GOOD SIGNS:
============================================================
🤖 AGENT DECISION REQUEST
============================================================
📝 Message: Perfect! Calibration is complete...
📊 Current State: { stage: 'calibration', ... }
🔧 Available Tools: 8
...
✅ GROK RESPONSE:
🔧 Tools to call: complete_calibration
💭 Reasoning: ...
============================================================

🔧 Executing tool: complete_calibration {}
✅ Navigation complete!
```

```
❌ BAD SIGNS (Tell me which you see):

1. No "🤖 AGENT DECISION REQUEST" = Frontend not calling API
2. "❌ AGENT ERROR" = Grok API failing
3. "🔧 Tools to call: NONE" = Grok not deciding correctly
4. No "🔧 Executing tool" = Tool execution failing
```

### 4. **Watch for UI Changes**

**What SHOULD happen when you click the button on Calibration page:**
1. "AI Agent Thinking..." appears (top-right)
2. Page auto-navigates to Sphere Test
3. Console shows tool execution logs

**If nothing happens:**
- Check console for errors
- Look at the message log (top-right, black panel)
- Tell me what errors you see

---

## New Features Added:

### 1. **Manual Test Button** (bottom-left, green)
- Triggers the agent at current stage
- Uses pre-defined messages per stage
- Lets you test without ElevenLabs

### 2. **Message Log** (top-right, black panel)
- Shows last 10 AI/Patient messages
- Helps debug if messages are captured

### 3. **Stage-Based Auto-Triggering**
- System monitors stage changes
- Auto-triggers agent when stage changes
- Fallback if ElevenLabs messages don't work

### 4. **Better Console Logging**
- Clear visual separators
- Shows full request/response
- Easier to spot errors

---

## Quick Tests:

### Test 1: Manual Button
1. Go to calibration page
2. Click "🧪 Test Auto-Progress"
3. Should auto-navigate to /sphere

### Test 2: XAI API
Open browser console and run:
```javascript
fetch('http://localhost:8787/api/agent/decide', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Calibration complete. Let's test your right eye.",
    currentState: { stage: 'calibration', hasCalibration: true },
    availableTools: [{
      name: 'complete_calibration',
      description: 'Complete calibration',
      parameters: {}
    }]
  })
})
.then(r => r.json())
.then(console.log);
```

Expected output:
```json
{
  "success": true,
  "toolCalls": [
    { "name": "complete_calibration", "parameters": {} }
  ],
  "reasoning": "..."
}
```

---

## Tell Me:

1. **Does the green button appear?** (bottom-left)
2. **What happens when you click it?**
3. **What do you see in the console?**
4. **Any errors?**

Take a screenshot of the console if possible!

---

## If It's Not Working:

The most likely issues:
1. ❌ **XAI API Key not working** - Check `.env`
2. ❌ **Grok endpoint changed** - API might be down
3. ❌ **ElevenLabs messages not captured** - Widget integration issue
4. ❌ **Tool execution failing** - Navigation/state update error

Let's figure out which one it is! 🔍




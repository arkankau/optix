# 🔍 Console Checklist - What to Look For

## After clicking "🧪 Test Auto-Progress" button:

### ✅ Expected Flow (in order):

1. **Button Click**
```
🧪 Manual test trigger
```

2. **Process AI Message Called**
```
🔍 processAIMessage called: {message: "Perfect! Calibration is complete...", isUser: false, isAgentActive: true}
```

3. **Agent Processing**
```
🤖 AI Agent processing message: Perfect! Calibration is complete...
🧠 Calling Grok API...
```

4. **API Call** (check terminal too!)
```
POST /api/agent/decide 200
```

5. **Grok Response**
```
📥 Grok response: {success: true, toolCalls: [...]}
✅ Grok returned 1 tool(s) to execute
```

6. **Tool Execution**
```
🔧 Executing tool: complete_calibration {}
```

7. **Navigation**
```
Page should auto-navigate to /sphere
```

---

## ❌ If It Stops At Step 2:

You see:
```
🔍 processAIMessage called: {..., isAgentActive: false}
⏭️ Skipping: Agent not active
```

**Issue**: Agent not started properly
**Look for**: Should see these BEFORE clicking button:
```
✅ ElevenLabs Widget is ready!
📊 State after ready: {isAIActive: true}
🚀 Starting AI Agent...
✅ AI Agent started - isAgentActive = true
```

---

## ❌ If It Stops At Step 4:

You see:
```
🧠 Calling Grok API...
❌ AI Agent error: [some error]
```

**Issue**: API call failing
**Check**: 
- Terminal for API errors
- XAI_GROK_API_KEY in .env

---

## ❌ If You See:

```
ℹ️ No tools returned by Grok
```

**Issue**: Grok not deciding correctly
**Check**: 
- Terminal for Grok's reasoning
- API key might be invalid

---

## 🎯 Quick Actions:

### 1. Refresh the Page
```
Cmd+R (Mac) or Ctrl+R (Windows)
```

### 2. Open Console
```
F12 or Cmd+Option+I
```

### 3. Clear Console
```
Click the 🚫 clear button
```

### 4. Click Green Button
```
Look for the 7 steps above
```

### 5. Tell Me:
**Which step number did it stop at?**
**What was the last message you saw?**

---

## Terminal Logs to Watch:

If API is being called, you should see in terminal:

```
============================================================
🤖 AGENT DECISION REQUEST
============================================================
📝 Message: Perfect! Calibration is complete...
📊 Current State: {
  "stage": "calibration",
  "hasCalibration": true,
  "currentEye": null
}
🔧 Available Tools: 8
...
✅ GROK RESPONSE:
🔧 Tools to call: complete_calibration
💭 Reasoning: The AI indicated calibration is complete...
============================================================
```

If you see:
```
❌ AGENT ERROR:
Error details: ...
```

Copy that error and send it to me!

---

## Most Common Issues:

1. **isAgentActive = false** 
   - Fix: Widget not ready or AI not activated
   
2. **XAI API Error** 
   - Fix: Check API key or use fallback

3. **Tool not executing** 
   - Fix: Navigation issue

Let's find which one it is! 🕵️



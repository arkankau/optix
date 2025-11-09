# 🔍 Debugging Agentic System

## Quick Diagnostics

### 1. Open Browser Console (F12 / Cmd+Option+I)

Look for these logs when AI speaks:

```
✅ SHOULD SEE:
🎤 AI Examiner: [message]
🤖 Agent deciding actions for: [message]
🔧 Grok decided to call tools: [tool names]
🔧 Executing tool: [tool name]

❌ IF MISSING: Issue found!
```

### 2. Test API Manually

Open browser console and run:

```javascript
// Test if agent endpoint works
fetch('http://localhost:8787/api/agent/decide', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Calibration is complete. Let's test your right eye.",
    currentState: { stage: 'calibration', hasCalibration: true, currentEye: null },
    availableTools: []
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Agent endpoint response:', data);
  if (data.toolCalls && data.toolCalls.length > 0) {
    console.log('✅ Grok returned tools:', data.toolCalls);
  } else {
    console.log('⚠️ No tools returned by Grok');
  }
})
.catch(err => console.error('❌ Agent endpoint error:', err));
```

### 3. Check XAI API Key

```javascript
// In browser console
console.log('XAI Key configured:', 
  'your_xai_api_key_here'.substring(0,20) + '...'
);
```

### 4. Check if AI Messages are Being Captured

```javascript
// Add this in browser console to intercept messages
window.addEventListener('message', (event) => {
  console.log('📨 Message event:', event.data);
});
```

## Common Issues

### Issue 1: ElevenLabs Widget Not Triggering Callbacks
**Symptom**: No "🎤 AI Examiner:" logs
**Fix**: Widget might not be exposing message events

### Issue 2: Grok API Failing
**Symptom**: "🤖 Agent deciding" but no "🔧 Grok decided"
**Fix**: API key or endpoint issue

### Issue 3: Tools Not Executing
**Symptom**: "🔧 Grok decided" but nothing happens
**Fix**: Tool execution error

## Next Steps

Check console now and tell me what you see!



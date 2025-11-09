# 🔍 Investigation Results: Why xAI Tools Aren't Being Called

## ❌ The Problem

**xAI is NOT being used** - The agent is NOT calling `analyzeVisionResponse`.

### Evidence from Logs:
- ✅ Agent connects successfully
- ✅ Agent speaks and listens
- ❌ **ZERO** `🧠 ClientTool: analyzeVisionResponse called` messages
- ❌ Agent says "I need to use my specialized tool" but **doesn't actually call it**
- ❌ Agent gets stuck in a loop

## 🕵️ Root Causes Found

### 1. **Client Tools Must Return Simple Types**

From `@elevenlabs/client` type definition:
```typescript
export type ClientToolsConfig = {
    clientTools: Record<string, (parameters: any) => 
        Promise<string | number | void> | string | number | void
    >;
};
```

**Our tool returns a complex object:**
```typescript
return {
  correct: result.correct,
  recommendation: result.recommendation,
  nextLine: params.line + 1,
  reasoning: result.reasoning,
  confidence: result.confidence,
  message: "..."  // <-- This is OK, but the object is NOT
};
```

❌ **Problem**: We're returning an object, but ElevenLabs expects `string | number | void`!

### 2. **Tools May Need Server-Side Registration**

ElevenLabs agents might need tools registered when the agent is created (server-side), not just in the React hook (client-side).

The agent's prompt tells it to call `analyzeVisionResponse`, but the agent doesn't know this tool exists because:
- ❌ It's not registered server-side in the agent creation API
- ❌ The React SDK's `clientTools` might only work for simple operations

## 💡 Solutions

### **Option A: Return Only a String (Simplest Fix)**

Modify our client tool to return just a message string:

```typescript
clientTools: {
  analyzeVisionResponse: async (params) => {
    // ... (xAI analysis)
    
    // Handle navigation and state updates here
    setCurrentTestLine(params.line);
    addXAIAnalysis({...});
    
    if (result.recommendation === 'complete') {
      // Handle eye switching/navigation
    }
    
    // Return ONLY a string
    return result.correct
      ? `Correct! ${result.recommendation === 'advance' ? 'Advance to next line.' : 'Test complete.'}`
      : `Incorrect. ${result.recommendation === 'complete' ? 'That is your limit.' : 'Try again.'}`;
  }
}
```

**Pros**: Might work with current setup  
**Cons**: Agent gets less structured data

### **Option B: Server-Side Tool Registration (More Complex)**

Register tools when creating the agent on the backend:

```typescript
const agent = await client.conversationalAi.agents.create({
  name: 'Optix Eye Test Assistant',
  conversationConfig: {
    agent: {
      prompt: {...},
      // Maybe there's a tools parameter here?
      clientTools: [
        {
          name: 'analyzeVisionResponse',
          description: 'Analyzes patient letter reading',
          parameters: {...}
        }
      ]
    }
  }
});
```

**Pros**: More robust, proper tool registration  
**Cons**: Need to find correct API syntax

### **Option C: Go Back to Option B from Earlier**

Use REST API for TTS + Web Speech API for STT + xAI for decisions.

**Pros**: Full control, we know it works  
**Cons**: Not using ElevenLabs SDK's full conversational features

## 🎯 Recommended Fix: Try Option A First

Since we're already returning a "message" field, let's try returning ONLY that string and see if the agent actually calls the tool.

If that doesn't work, we should go back to **Option C** (simple REST + Web Speech API) because we know that architecture works.


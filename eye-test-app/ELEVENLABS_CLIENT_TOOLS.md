# ElevenLabs SDK + xAI Client Tools Architecture

## 🎯 Overview

This system uses **ElevenLabs Conversational SDK** for natural voice interaction, combined with **xAI (Grok) Client Tools** for intelligent decision-making. The agent conducts the conversation while xAI analyzes responses and controls progression.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User (Patient)                           │
└────────────────────┬────────────────────────────────────────┘
                     │ Speech
                     ↓
┌─────────────────────────────────────────────────────────────┐
│            ElevenLabs Conversational SDK                    │
│  • Speech Recognition (STT)                                 │
│  • Text-to-Speech (TTS)                                    │
│  • Conversational Flow                                     │
└────────────────────┬────────────────────────────────────────┘
                     │ Text Transcript
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              ElevenLabs Agent                               │
│  • Asks questions: "Read line 1"                          │
│  • Listens to responses                                   │
│  • Calls client tools for analysis                        │
└────────────────────┬────────────────────────────────────────┘
                     │ Tool Call: analyzeVisionResponse()
                     ↓
┌─────────────────────────────────────────────────────────────┐
│            Client Tool (GlobalAIAssistant)                  │
│  • Receives: letters, expectedLetters, line, eye          │
│  • Calls xAI API with previous performance history        │
│  • Returns: {correct, recommendation, reasoning}           │
│  • Updates UI: current line, stage, results               │
│  • Handles navigation: eye switching, test completion     │
└────────────────────┬────────────────────────────────────────┘
                     │ xAI API Call
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                  xAI (Grok Backend)                         │
│  • Analyzes patient response vs expected                   │
│  • Considers previous performance                          │
│  • Returns: recommendation ('advance' or 'complete')       │
└────────────────────┬────────────────────────────────────────┘
                     │ Analysis Result
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              UI Updates (React)                             │
│  • Chart shows current line (from Zustand)                 │
│  • Conversation panel shows transcript                     │
│  • Auto-navigation on test completion                      │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Key Files

### 1. **GlobalAIAssistant.tsx** - Main Orchestrator
- Uses `useConversation` from ElevenLabs SDK
- Defines `clientTools` object with `analyzeVisionResponse`
- Handles navigation and state updates
- Syncs with Zustand for UI reactivity

```typescript
const conversation = useConversation({
  clientTools: {
    analyzeVisionResponse: async (params) => {
      // Update UI line
      setCurrentTestLine(params.line);
      
      // Call xAI
      const result = await api.analyzeResponse({...});
      
      // Store analysis
      addXAIAnalysis({...});
      
      // Handle navigation on 'complete'
      if (result.recommendation === 'complete') {
        // Switch eye or navigate to next test
      }
      
      // Return to agent
      return {
        correct: result.correct,
        recommendation: result.recommendation,
        nextLine: params.line + 1,
        message: "..."
      };
    }
  },
  onConnect: () => setElevenLabsReady(true),
  onMessage: (msg) => { /* Store transcripts */ },
  // ...
});
```

### 2. **apps/api/src/routes/elevenlabs.ts** - Agent Prompt
- Creates ElevenLabs agent with detailed instructions
- Tells agent to ALWAYS use `analyzeVisionResponse` tool
- Provides expected letters for each line
- Instructs on handling 'advance' vs 'complete' recommendations

```typescript
prompt: `You are a warm, professional optometry assistant.

🧠 CRITICAL: You have a tool "analyzeVisionResponse" - use it for ALL letter reading.

📋 EXPECTED LETTERS BY LINE:
Line 1: "E"
Line 2: "F P"
...

WORKFLOW:
1. Say: "Read line 1"
2. Listen to patient
3. IMMEDIATELY call: analyzeVisionResponse({letters: "...", expectedLetters: "...", line: 1, eye: "OD"})
4. Wait for tool result
5. React based on result.recommendation:
   - "advance": "Great! Now read line 2"
   - "complete": "Perfect! Test complete for this eye."
`
```

### 3. **SphereTest.tsx** - Simplified UI
- Just displays the chart at `currentTestLine` (from Zustand)
- No analysis logic (handled by client tool)
- No button clicking (fully conversational)
- Sets stage on mount

```typescript
const currentLine = useTestStore(state => state.currentTestLine);

return (
  <div>
    <h1>Sphere Test - {currentEye}</h1>
    <FixedLettersChart 
      currentLine={currentLine} 
      pixelsPerArcmin={calibration.pixelsPerArcmin} 
    />
    <p>Line {currentLine} of 11</p>
  </div>
);
```

### 4. **testStore.ts** - Global State
- Added `currentTestLine: number` to track which line is being tested
- Added `setCurrentTestLine(line)` action
- Client tool updates this to sync UI

## 🔄 Conversation Flow Example

### Right Eye Test:
```
1. Agent: "Hello! Let's test your right eye. Cover your left eye and read line 1."
   [SDK auto-listens]

2. Patient: "E"
   [SDK captures, sends to agent]

3. Agent thinks: "I need to analyze this"
   [Agent calls: analyzeVisionResponse("E", "E", 1, "OD")]

4. Client Tool:
   - setCurrentTestLine(1)  // UI updates
   - Calls xAI API
   - xAI returns: {correct: true, recommendation: "advance"}
   - Stores analysis in Zustand
   - Returns to agent: {correct: true, recommendation: "advance", nextLine: 2}

5. Agent: "Correct! Now read line 2."
   [Repeat for each line...]

6. Eventually xAI returns: {recommendation: "complete"}

7. Client Tool:
   - Calculates sphere result from best line
   - Saves to Zustand: setSphereResult('OD', {...})
   - Switches eye: setCurrentEye('OS'), setStage('sphere_os')
   - No navigation (stays on same page for left eye)

8. Agent: "Perfect! Now let's test your left eye..."
   [Repeats for left eye]

9. After left eye completes:
   - Client tool navigates to /jcc for astigmatism test
```

## 🎨 UI/UX Benefits

✅ **Fully Conversational** - No buttons, pure voice interaction  
✅ **xAI in Control** - Medical decisions made by AI, not hardcoded logic  
✅ **Predictable** - Agent MUST call tools, can't freelance  
✅ **Reactive UI** - Chart updates automatically via Zustand  
✅ **Smooth Flow** - Auto-navigation between tests  
✅ **Movie-style Subtitles** - Real-time transcript display  

## 🧪 Testing the System

1. **Start the app**: `pnpm dev`
2. **Click "Start with AI Assistant"**
3. **Calibrate screen**
4. **Agent starts conversation automatically**
5. **Say letters when prompted**
6. **Agent calls xAI for each response**
7. **Watch UI update in real-time**
8. **Test completes and advances automatically**

## 🔧 Debugging

### Check if agent is calling the tool:
```javascript
console.log('🧠 ClientTool: analyzeVisionResponse called by agent', params);
```

### Check xAI response:
```javascript
console.log('✅ xAI Analysis result:', result);
```

### Check navigation:
```javascript
console.log('🔄 Switching to left eye (OS)');
console.log('🔄 Both eyes complete, moving to JCC');
```

### Manual Controls (Debugging):
Press `Ctrl+Shift+M` to toggle manual control panel showing:
- Current stage
- Current eye
- AI status
- Manual action buttons

## 🚀 Next Steps

- [ ] Add JCC (astigmatism) client tool
- [ ] Add error recovery if agent doesn't call tool
- [ ] Add timeout if patient doesn't respond
- [ ] Add celebration animation on test completion
- [ ] Export results to PDF

## 📝 Notes

- Agent is created once and cached (per backend restart)
- xAI API key must be set in `.env`: `XAI_GROK_API_KEY=...`
- ElevenLabs API key must be set: `ELEVENLABS_API_KEY=...`
- Client tools are synchronous from agent's perspective (even though async under the hood)
- Agent has NO access to screen/UI - relies entirely on tool results


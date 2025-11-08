# 🤖 AI-Driven Eye Examination Flow

## Overview

The Nearify Exam is now **fully AI-driven**. The ElevenLabs Conversational AI acts as your personal eye examiner, guiding patients through every step from calibration to final results.

---

## 🎯 Complete User Journey

### 1. Home Page
**What Happens:**
- Patient reads about the AI-guided examination
- Clicks "🎤 Start AI-Guided Exam"
- System creates session and activates AI examiner
- AI widget appears in bottom-right corner

**AI State:**  
✅ **Activated and ready**

---

### 2. Calibration Page
**What Patient Sees:**
- Credit card calibration box
- Viewing distance slider
- "Continue to Test" button
- AI guidance banner

**What AI Does:**
```
"Welcome! I'm your AI examination assistant. Before we test your vision, 
we need to calibrate your screen for accuracy.

First, please place a credit card against the blue box on your screen. 
Adjust the slider until the box matches the card width exactly.

[WAITS for patient to adjust]

Great! Now, please measure your distance from the screen. The standard 
testing distance is 60 centimeters or about 24 inches. Adjust the second 
slider to match your actual distance.

[WAITS for patient confirmation]

Perfect! Your screen is now calibrated. [CMD:calibration_complete] 
Let's begin testing your vision."
```

**Technical Flow:**
1. AI speaks instructions
2. Patient adjusts sliders via UI
3. Patient says "Done" or "Ready"
4. AI sends `[CMD:calibration_complete]`
5. System auto-navigates to `/sphere`

---

### 3. Sphere Test - Right Eye (OD)
**What Patient Sees:**
- Snellen eye chart (11 lines)
- Blue highlight on current line
- AI guidance panel
- AI widget (bottom-right)

**What AI Does:**
```
[CMD:start_sphere_test:{"eye":"OD"}]

"Let's start by testing your right eye. Please cover your LEFT eye with 
your hand or an eye patch, keeping your RIGHT eye open.

You'll see a Snellen eye chart - the same chart used by optometrists. 
I'll guide you through it line by line.

Let's start with the top line. Can you read the largest letter at the top?"

[PATIENT: "E"]

"Perfect! Now read the next line with two letters."

[PATIENT: "F P"]

"Excellent! Continue to the next line, please."

[Process continues through lines 1-11]

[When patient struggles or makes errors:]
"That's completely normal. Let's focus on the previous line you could see."

[When complete:]
"Excellent work on your right eye! [CMD:sphere_complete] 
Now let's test your left eye."
```

**Technical Flow:**
1. AI starts conversation for OD
2. Patient reads lines aloud
3. AI evaluates responses (using voice recognition)
4. System tracks best readable line (stored in `currentLine` state)
5. AI sends `[CMD:sphere_complete]` when done
6. System calculates sphere value from best line
7. Auto-switches to left eye

---

### 4. Sphere Test - Left Eye (OS)
**Same process as right eye, but:**
- `currentEye` changes to "OS"
- Eye chart remains the same
- Patient now covers RIGHT eye

**AI Script:**
```
[CMD:start_sphere_test:{"eye":"OS"}]

"Now please cover your RIGHT eye and keep your LEFT eye open.

Let's go through the chart again. Start by reading the top letter..."

[Same testing protocol]

"Perfect! Both eyes tested. [CMD:sphere_complete] 
Now we'll check for astigmatism."
```

**Technical Flow:**
1. `currentEye` = "OS"
2. Same line-by-line process
3. System stores OS sphere result
4. AI sends `[CMD:sphere_complete]`
5. Auto-navigates to `/jcc`

---

### 5. Astigmatism Test (JCC)
**What Patient Sees:**
- Random pattern (radial/grid/fan)
- AI guidance panel
- AI widget continues conversation

**What AI Does:**
```
[CMD:start_astigmatism_test]

"For this test, you'll see a pattern on the screen. This helps us detect 
astigmatism, which is when your eye has an irregular shape.

Look at the pattern and tell me:
1. Do all the lines look equally clear and dark?
2. Or are some lines sharper/darker than others?
3. If so, which direction are the clearest lines?"

[PATIENT responds about pattern clarity]

"Thank you. Based on your responses, I'm adjusting the test..."

[AI guides through refinements]

"Excellent! That completes your astigmatism testing. 
[CMD:astigmatism_complete]"
```

**Technical Flow:**
1. Random pattern displayed
2. AI asks questions
3. System records responses
4. JCC algorithm runs (binary search for axis/cylinder)
5. AI sends `[CMD:astigmatism_complete]`
6. Auto-navigates to `/summary`

---

### 6. Summary Page
**What Patient Sees:**
- Complete prescription for both eyes:
  - OD (Right Eye): Sphere, Cylinder, Axis, VA
  - OS (Left Eye): Sphere, Cylinder, Axis, VA
- "Export CSV" button
- "Start New Exam" button

**What AI Does:**
```
"Thank you for completing the examination! Your results have been calculated.

You can now view your complete prescription on screen, including:
- Sphere values for distance vision in both eyes
- Cylinder and axis values for astigmatism correction
- Your visual acuity scores

Would you like me to explain what these numbers mean, 
or do you have any questions about your results?"
```

**Technical Flow:**
1. System displays final Rx
2. AI provides summary explanation
3. Patient can export or restart

---

## 🎤 AI Command Reference

### Commands the AI Can Send

| Command | Parameters | Action |
|---------|-----------|--------|
| `[CMD:calibration_complete]` | None | Navigate to sphere test |
| `[CMD:start_sphere_test:{"eye":"OD"}]` | `eye`: "OD" or "OS" | Start sphere test for specified eye |
| `[CMD:sphere_complete]` | None | Complete current sphere test, move to next |
| `[CMD:start_astigmatism_test]` | None | Start JCC astigmatism test |
| `[CMD:astigmatism_complete]` | None | Complete astigmatism test, show summary |
| `[CMD:restart_exam]` | None | Return to home page |
| `[CMD:update_card_width:{"pixels":300}]` | `pixels`: number | Adjust calibration card width |
| `[CMD:update_viewing_distance:{"cm":60}]` | `cm`: number | Adjust viewing distance |

### How Commands Work

1. **AI speaks**: "Great job! [CMD:sphere_complete] Now let's test your left eye."
2. **Frontend parses**: `parseAIMessage()` extracts command
3. **System executes**: `handleAICommand({ action: "sphere_complete" })`
4. **UI updates**: Navigation, state changes, etc.
5. **Patient sees**: Seamless transition (commands are invisible)

---

## 💻 Technical Architecture

### Component Hierarchy

```
App (with AIProvider)
├── GlobalAIAssistant (bottom-right, always visible)
│   └── ElevenLabsWidget (conversational AI)
├── Header (shows current stage)
└── Routes
    ├── Home (activate AI on start)
    ├── Calibration (AI guides adjustments)
    ├── SphereTest (AI guides chart reading)
    ├── JCCTest (AI guides pattern evaluation)
    └── Summary (AI explains results)
```

### State Management

**AIContext:**
```typescript
{
  isAIActive: boolean;         // Is AI examiner active?
  currentStage: string;         // Current exam stage
  handleAICommand: (cmd) => {}; // Process AI commands
  sendContextToAI: (ctx) => {}; // Send app state to AI
}
```

**TestStore (Zustand):**
```typescript
{
  sessionId: string;
  stage: 'calibration' | 'sphere_od' | 'sphere_os' | 'jcc_od' | 'summary';
  currentEye: 'OD' | 'OS';
  calibration: { pixelsPerCm, viewingDistanceCm, ... };
  sphereResults: { OD: {...}, OS: {...} };
  jccResults: { OD: {...}, OS: {...} };
}
```

### Data Flow

```
1. User starts exam
   ↓
2. AI activated (GlobalAIAssistant mounts)
   ↓
3. AI speaks → Patient responds
   ↓
4. AI sends command [CMD:...]
   ↓
5. Frontend parses command
   ↓
6. AIContext.handleAICommand()
   ↓
7. State updates (Zustand)
   ↓
8. UI reacts (React components)
   ↓
9. Context sent back to AI
   ↓
10. AI continues conversation
```

---

## 🔧 Setup Instructions

### 1. Configure ElevenLabs Agent

Go to your ElevenLabs dashboard and create a new Conversational AI agent:

**Agent Settings:**
- **Name**: Nearify Eye Examiner
- **Voice**: Professional, clear, friendly (recommend: "Rachel" or "Adam")
- **System Prompt**: Copy from `ELEVENLABS_SYSTEM_PROMPT.md`
- **Agent ID**: `agent_0801k9h75d11eh2bjnwsmkn9t932` (or your custom ID)

### 2. Update Environment Variables

```env
# apps/api/.env
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_AGENT_ID=agent_0801k9h75d11eh2bjnwsmkn9t932
XAI_GROK_API_KEY=your_grok_key_here
GEMINI_API_KEY=your_gemini_key_here
```

### 3. Save Eye Chart Image

```bash
# Save your Snellen chart PNG to:
apps/web/public/assets/eye-chart.png
```

### 4. Run the App

```bash
pnpm dev
```

### 5. Test the Flow

1. Navigate to `http://localhost:5173`
2. Click "🎤 Start AI-Guided Exam"
3. Follow AI instructions through:
   - Calibration
   - Right eye sphere test
   - Left eye sphere test
   - Astigmatism test
   - Results summary

---

## 🎯 Key Features

### ✅ Fully Voice-First
- AI speaks all instructions
- Patient responds naturally
- No need to click buttons (AI controls flow)

### ✅ Conversational & Natural
- Feels like talking to a real optometrist
- AI adapts to patient responses
- Encouraging and supportive

### ✅ Clinically Accurate
- Real Snellen chart
- Standard testing protocols
- Proper sphere/cylinder/axis calculations

### ✅ Seamless Transitions
- No jarring page changes
- AI smoothly guides between stages
- Context always maintained

---

## 🐛 Troubleshooting

### AI Widget Not Appearing
- Check console for "🤖 AI Examiner activated"
- Verify ELEVENLABS_AGENT_ID is correct
- Ensure ElevenLabs script loaded (`index.html`)

### Commands Not Working
- Check console for "🤖 AI Command: ..." logs
- Verify command format: `[CMD:action:params]`
- Ensure AIContext is properly wrapped around app

### Eye Chart Not Showing
- Verify `apps/web/public/assets/eye-chart.png` exists
- Check browser console for 404 errors
- Try hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)

---

## 📚 Related Documentation

- `ELEVENLABS_SYSTEM_PROMPT.md` - Complete AI agent prompt
- `EYECHART_INTEGRATION.md` - Eye chart technical details
- `ENV_SETUP.md` - Environment setup guide
- `DEMO.md` - Original demo script (now AI-driven)

---

**You now have a fully AI-driven, voice-first eye examination system!** 🎉👁️🤖



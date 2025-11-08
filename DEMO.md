# OptiX Exam — Demo Script

## 🎯 Prize Integration Callouts

This MVP demonstrates the following prize-winning integrations:

### 1. **ElevenLabs** — Natural Voice TTS
- ✅ All voice prompts use ElevenLabs TTS
- ✅ Console logs: `🔊 Using ElevenLabs for prompt: "..."`
- ✅ Low-latency streaming for smooth UX
- See: `packages/voice/src/elevenlabs.ts`

### 2. **Google Gemini** — STT + NLU Policy
- ✅ Speech-to-text for letter reading
- ✅ Function-calling for test policy recommendations
- ✅ Console logs: `🎤 Gemini parsed: "C D Z O P" (95%)`
- See: `packages/voice/src/gemini.ts`

### 3. **xAI Grok** — Realtime Policy Advisor
- ✅ Monitors confidence, latency, misses in real-time
- ✅ Suggests adjustments: "reduce step size", "allocate more trials"
- ✅ Console logs: `🤖 Grok suggestion: ...`
- ✅ UI: Blue banner with Grok hints
- See: `packages/agent/src/grok.ts`

### 4. **Photon** — Hybrid Fallback Routing
- ✅ Dynamically switches to easier/harder modes
- ✅ Routes to "abort" if patient struggling
- ✅ Console logs: `⚡ Photon: Switching to EASIER mode`
- ✅ UI: Orange banner with encouragement
- See: `packages/agent/src/photon.ts`

### 5. **Dedalus** — Agent Tool Router
- ✅ Orchestrates workflow: calibrate → staircase → JCC → summary
- ✅ Console logs: `🎯 Dedalus routing: stage=...`
- ✅ Decides which tool to invoke next
- See: `packages/agent/src/dedalus.ts`

### 6. **.tech Domain** — Modern Stack
- ✅ TypeScript monorepo
- ✅ Vite + React + Zustand
- ✅ Node + Express + SQLite
- ✅ Production-ready architecture

---

## 🚀 Quick Start

### Prerequisites
```bash
node --version  # v18+
pnpm --version  # v8+
```

### Installation
```bash
# Install all dependencies
pnpm install

# Set up environment (copy and edit)
cp .env.example .env

# Edit .env with your API keys:
# - ELEVENLABS_API_KEY
# - GEMINI_API_KEY
# - XAI_GROK_API_KEY
```

### Development
```bash
# Run both API and Web in parallel
pnpm dev

# API: http://localhost:8787
# Web: http://localhost:5173
```

---

## 📊 Demo Flow

### 1. **Home Screen** (`/`)
- Click "Start Vision Test"
- Creates session via API
- Shows integration badges

### 2. **Calibration** (`/calibration`)
- Credit card sizing (85.6mm standard)
- Distance input (default 60cm)
- Calculates pixels/arcmin for optotype sizing

### 3. **Sphere Test** (`/sphere`)
- **Right Eye (OD) first**
  - 1-up/2-down staircase
  - Voice input: "C D Z O P"
  - Letter size adapts based on logMAR
  - Grok hints appear when confidence drops
  - Photon switches to "easier" mode after 3 misses
- **Left Eye (OS) second**
  - Same process

### 4. **JCC Astigmatism Test** (`/jcc`)
- **Right Eye (OD) first**
  - Jackson Cross Cylinder simulation
  - Voice or button: "One" or "Two"
  - Axis refinement (15° → 10° → 5°)
  - Power refinement (±0.25 D steps)
- **Left Eye (OS) second**
  - Same process

### 5. **Summary** (`/summary`)
- Final Rx display:
  - OD: Sphere, Cylinder, Axis, VA
  - OS: Sphere, Cylinder, Axis, VA
- Confidence scores per eye
- Integration status badges (all ✓)
- CSV export button
- Restart test button

---

## 🎤 Voice Commands

### Letter Reading (Sphere Test)
- Say letters from left to right
- Example: "C D Z O P"
- Gemini parses and validates

### Choice Making (JCC Test)
- Say "one" or "two"
- Or click buttons

### Commands (Any Time)
- "Next" — skip trial
- "Repeat" — show again
- "Stop" — abort test

---

## 📝 Console Prize Callouts

Watch the browser console during the test:

```
🔊 Using ElevenLabs for prompt: "Great! Read the next line."
🎤 Gemini parsed: "C D Z O P" (85%)
🤖 Grok suggestion: reduce axis step to 5° (Confidence dipped <0.75)
⚡ Photon: Switching to EASIER mode (3+ consecutive misses)
🎯 Dedalus routing: stage=sphere_od, calibrated=true
📊 Generated Rx for session abc123
   OD: -0.75 -0.50 × 90°
   OS: -1.00 -0.25 × 180°
```

---

## 🗄️ SQLite Database

Location: `./OptiX.sqlite`

Tables:
- **sessions**: Test sessions
- **events**: Trial-by-trial logs
- **rx**: Final prescriptions

Query example:
```bash
sqlite3 OptiX.sqlite "SELECT * FROM rx;"
```

---

## 🏗️ Architecture Highlights

### Monorepo Structure
```
apps/
  api/        — Express + SQLite backend
  web/        — Vite + React frontend
packages/
  core/       — Staircase + JCC algorithms
  agent/      — Grok + Photon + Dedalus
  voice/      — ElevenLabs + Gemini
```

### Key Algorithms
- **Staircase**: `packages/core/src/staircase.ts`
  - 1-up/2-down adaptive threshold
  - 6 reversals → converged
  - Maps logMAR → sphere correction
  
- **JCC**: `packages/core/src/jcc.ts`
  - Binary search over axis (180°)
  - Power refinement (±0.25 D)
  - Stage: axis → power → done

### API Endpoints
- `POST /api/session` — Create session
- `POST /api/staircase/next` — Advance staircase
- `POST /api/jcc/next` — Advance JCC
- `POST /api/voice/tts` — Text-to-speech
- `POST /api/voice/stt` — Speech-to-text
- `POST /api/summary` — Save final Rx
- `GET /api/summary/:id/export` — Export CSV

---

## 🎨 UI Features

### Dark Theme
- Modern dark UI optimized for eye testing
- High contrast optotypes on black background
- Minimal distractions

### Canvas Renderer
- Pixel-perfect optotype sizing
- Monospace font (Courier New)
- Spacing: 1.5x letter width

### Voice UI
- Hold-to-record button
- Visual feedback (pulse animation)
- Processing state with spinner

### Alert Banners
- **Grok (Blue)**: AI policy hints
- **Photon (Orange)**: Difficulty adjustments
- Auto-dismiss after 5 seconds

---

## 🧪 Testing Tips

### Without API Keys
- App works with mock responses
- Logs show "⚠️ API_KEY not set"
- TTS uses silent mock audio
- STT uses fallback "C D Z O P"

### With Real Keys
1. Get ElevenLabs key: https://elevenlabs.io
2. Get Gemini key: https://ai.google.dev
3. Get Grok key: https://x.ai
4. Add to `.env`
5. Restart `pnpm dev`

### Quick Test (No Voice)
- Use button clicks for JCC (skip voice)
- Type "C D Z O P" in console to simulate (dev mode)

---

## 📦 Deployment

### Vercel (Recommended)
```bash
# Build all packages
pnpm build

# Deploy API (separate project)
cd apps/api
vercel

# Deploy Web (separate project)
cd apps/web
vercel
```

### Environment Variables
Set in Vercel dashboard:
- `ELEVENLABS_API_KEY`
- `GEMINI_API_KEY`
- `XAI_GROK_API_KEY`
- `PHOTON_API_KEY`
- `DEDALUS_API_KEY`
- `FRONTEND_ORIGIN` (your web URL)

---

## 🏆 Prize Criteria Checklist

- ✅ **ElevenLabs**: All prompts use TTS, console logs confirm
- ✅ **Gemini**: STT + function-calling policy, logs show parsing
- ✅ **Grok**: Real-time hints, UI banners, console suggestions
- ✅ **Photon**: Dynamic routing, "easier" mode, encouragement
- ✅ **Dedalus**: Tool orchestration, stage routing, console logs
- ✅ **.tech**: Modern TypeScript stack, production-ready
- ✅ **Demo Ready**: End-to-end flow, CSV export, persistence

---

## 📞 Support

Questions? Check:
- `README.md` — Overview
- `packages/*/src/*.ts` — Source code
- Console logs — Integration callouts
- `apps/api/src/index.ts` — API startup messages

---

**Built with ❤️ for Amazon, ElevenLabs, Gemini, xAI, Photon, Dedalus, and .tech**


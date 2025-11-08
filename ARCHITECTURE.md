# 🏗️ Architecture Documentation

## System Overview

OptiX Exam is a voice-first subjective refraction exam built as a TypeScript monorepo with clear separation of concerns.

```
┌─────────────────────────────────────────────────────┐
│                   Browser (Client)                   │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ React UI     │  │ Voice Input │  │ Canvas     │ │
│  │ (Vite)       │  │ (MediaAPI)  │  │ Renderer   │ │
│  └──────┬───────┘  └──────┬──────┘  └────────────┘ │
└─────────┼──────────────────┼──────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────┐
│              Express API Server (Node)               │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │ REST API │  │ SQLite   │  │ Core Algorithms   │ │
│  │ Routes   │  │ Database │  │ (Staircase, JCC)  │ │
│  └────┬─────┘  └──────────┘  └─────────┬─────────┘ │
└───────┼──────────────────────────────────┼─────────┘
        │                                  │
        ▼                                  ▼
┌─────────────────────────────────────────────────────┐
│              External AI Services                    │
│  ┌────────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │ ElevenLabs │  │  Gemini  │  │  xAI Grok       │ │
│  │ (TTS)      │  │ (STT+NLU)│  │  (Policy)       │ │
│  └────────────┘  └──────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Package Architecture

### Monorepo Structure

```
OptiX-exam/
├── apps/
│   ├── api/              # Backend Express server
│   │   ├── src/
│   │   │   ├── index.ts          # Server entry
│   │   │   ├── db.ts             # SQLite client
│   │   │   └── routes/           # API endpoints
│   │   │       ├── session.ts
│   │   │       ├── event.ts
│   │   │       ├── voice.ts
│   │   │       ├── staircase.ts
│   │   │       ├── jcc.ts
│   │   │       └── summary.ts
│   │   └── package.json
│   │
│   └── web/              # Frontend React app
│       ├── src/
│       │   ├── App.tsx           # Router setup
│       │   ├── main.tsx          # Entry point
│       │   ├── store/            # Zustand state
│       │   │   └── testStore.ts
│       │   ├── api/              # API client
│       │   │   └── client.ts
│       │   ├── components/       # Reusable UI
│       │   │   ├── Header.tsx
│       │   │   ├── VoiceButton.tsx
│       │   │   ├── OptotypeCanvas.tsx
│       │   │   ├── TTSPlayer.tsx
│       │   │   └── AlertBanner.tsx
│       │   └── pages/            # Route pages
│       │       ├── Home.tsx
│       │       ├── Calibration.tsx
│       │       ├── SphereTest.tsx
│       │       ├── JCCTest.tsx
│       │       └── Summary.tsx
│       └── package.json
│
└── packages/
    ├── core/             # Core algorithms & types
    │   ├── src/
    │   │   ├── types.ts          # Shared types
    │   │   ├── staircase.ts      # 1-up/2-down algorithm
    │   │   ├── jcc.ts            # Jackson Cross Cylinder
    │   │   └── optotypes.ts      # Letter generation & scoring
    │   └── package.json
    │
    ├── voice/            # Voice service wrappers
    │   ├── src/
    │   │   ├── elevenlabs.ts     # TTS client
    │   │   └── gemini.ts         # STT + NLU client
    │   └── package.json
    │
    └── agent/            # AI agent routing
        ├── src/
        │   ├── grok.ts           # xAI policy advisor
        │   ├── photon.ts         # Hybrid routing
        │   └── dedalus.ts        # Tool orchestration
        └── package.json
```

---

## Core Algorithms

### 1. Staircase Algorithm (Sphere Testing)

**Location**: `packages/core/src/staircase.ts`

**Purpose**: Adaptive threshold estimation for visual acuity

**Algorithm**: 1-up/2-down staircase
- One incorrect → increase size (easier)
- Two consecutive correct → decrease size (harder)
- Tracks reversals (direction changes)
- Converges after 6 reversals
- Calculates threshold from last 4 reversals

**Key Functions**:
```typescript
initStaircase(eye: Eye): StairState
nextStairState(state: StairState, wasCorrect: boolean): StairState
calculateThreshold(state: StairState): number
logmarToSphere(logmar: number): number
```

**Flow**:
```
Start at 0.4 logMAR (20/50)
   ↓
Show 5 letters
   ↓
User reads → correct/incorrect
   ↓
Adjust size based on 1-up/2-down rule
   ↓
Repeat until 6 reversals
   ↓
Average last 4 reversal points = threshold
   ↓
Convert logMAR to sphere (D)
```

### 2. JCC Algorithm (Astigmatism Testing)

**Location**: `packages/core/src/jcc.ts`

**Purpose**: Refine cylinder axis and power

**Algorithm**: Binary search with staged refinement
- **Stage 1: Axis** (0-180°)
  - Start at 90°, step size 15°
  - User picks clearer orientation (1 or 2)
  - Reduce step: 15° → 10° → 5°
  - Move to power when step ≤ 5°
- **Stage 2: Power** (-2.00 to 0.00 D)
  - Start at -0.50 D
  - Increase/decrease by 0.25 D
  - Stop when stable or at limits

**Key Functions**:
```typescript
initJcc(eye: Eye): JccState
nextJcc(state: JccState, choice: 1 | 2): JccState
getJccResult(state: JccState): { axis: number; cyl: number }
```

**Flow**:
```
Start: axis=90°, cyl=-0.50D, step=15°
   ↓
Show two orientations (±45° from current)
   ↓
User picks clearer (1 or 2)
   ↓
Rotate axis in preferred direction
   ↓
Reduce step size when consistent
   ↓
Stage: axis → power
   ↓
Adjust cylinder strength
   ↓
Done when stable (3+ same choices)
```

---

## AI Integration Architecture

### 1. ElevenLabs (TTS)

**Location**: `packages/voice/src/elevenlabs.ts`

**Integration Points**:
- All voice prompts: "Read the next line", "Which is clearer?"
- Endpoint: `POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}`
- Model: `eleven_monolingual_v1`
- Voice: Rachel (default)

**Usage**:
```typescript
const audioBuffer = await ttsSpeak(text, { voiceId: "Rachel" });
const audio = new Audio(URL.createObjectURL(new Blob([audioBuffer])));
audio.play();
```

**Fallback**: Mock silent audio if key not available

### 2. Gemini (STT + NLU)

**Location**: `packages/voice/src/gemini.ts`

**Integration Points**:
1. **STT**: Convert speech → text
   - Input: Audio blob (base64)
   - Output: "C D Z O P" (letters)
   
2. **NLU**: Policy recommendations
   - Input: Test state (confidence, misses, latency)
   - Output: Action + reasoning
   
3. **Intent Detection**:
   - Parse: "one", "two", "next", "repeat"

**Usage**:
```typescript
// STT
const { text, confidence } = await sttGemini(audioBase64);

// Policy
const policy = await policyGemini({
  stage: "sphere",
  confidence: 0.75,
  reversals: 3,
  ...
});
```

**Fallback**: Mock "C D Z O P" response

### 3. xAI Grok (Policy Advisor)

**Location**: `packages/agent/src/grok.ts`

**Integration Points**:
- Monitors live signals: confidence, latency, misses
- Suggests adjustments: step size, difficulty, stopping
- Endpoint: `POST https://api.x.ai/v1/chat/completions`

**Live Signals**:
```typescript
interface LiveSignals {
  misses: number;
  latencyMs: number;
  confidence: number;
  stage: "sphere" | "jcc";
  reversals: number;
  trialCount: number;
}
```

**Hints**:
```typescript
interface GrokHint {
  suggestion: string;      // "reduce axis step to 5°"
  reason: string;          // "Confidence dipped <0.75"
  priority: "low" | "medium" | "high";
}
```

**Fallback**: Rule-based logic (confidence thresholds)

### 4. Photon (Hybrid Routing)

**Location**: `packages/agent/src/photon.ts`

**Integration Points**:
- Dynamically adjusts test difficulty
- Routes: normal / easier / harder / abort
- Triggers on: misses, latency, confidence

**Routing Logic**:
```typescript
function photonRoute(context: RoutingContext): RoutingDecision {
  // 3+ consecutive misses → easier
  // High latency + low confidence → easier
  // 5+ correct + high confidence → harder
  // Unstable fixation + misses → abort
}
```

**UI Impact**:
- **Easier**: Larger letters, encouragement message
- **Harder**: Smaller letters (faster convergence)
- **Abort**: Stop test, suggest break

**Always Available**: Pure logic, no external API

### 5. Dedalus (Tool Router)

**Location**: `packages/agent/src/dedalus.ts`

**Integration Points**:
- Orchestrates test workflow
- Decides next tool: calibrate / staircase / jcc / summary
- State machine based on stage

**Workflow**:
```typescript
idle
  ↓
calibrate (screen sizing)
  ↓
sphere_od (right eye staircase)
  ↓
sphere_os (left eye staircase)
  ↓
jcc_od (right eye astigmatism)
  ↓
jcc_os (left eye astigmatism)
  ↓
complete (generate Rx)
```

**Tool Decision**:
```typescript
function dedalusDecide(context: ToolContext): ToolDecision {
  if (!calibrated) return { tool: "calibrate", ... };
  if (stage === "sphere_od") return { tool: "staircase.next", ... };
  if (stage === "jcc_od") return { tool: "jcc.next", ... };
  // ...
}
```

**Always Available**: State machine, no external API

---

## Data Flow

### 1. Session Creation
```
User clicks "Start Test"
   ↓
Web → POST /api/session
   ↓
API creates session in SQLite
   ↓
Returns sessionId
   ↓
Web stores in Zustand
```

### 2. Calibration
```
User adjusts card width & distance
   ↓
Calculate pixels/cm and pixels/arcmin
   ↓
Store in Zustand
   ↓
Navigate to sphere test
```

### 3. Sphere Test Trial
```
Show letters at current logMAR
   ↓
User speaks → record audio
   ↓
Web → POST /api/voice/stt (audio blob)
   ↓
API → Gemini STT
   ↓
Parse letters: "C D Z O P"
   ↓
Score correctness (≥60% = pass)
   ↓
Web → POST /api/staircase/next (state, wasCorrect, latency)
   ↓
API advances staircase
   ↓
API → Grok (check signals)
   ↓
API → Photon (check routing)
   ↓
Return: newState, complete, grokHint, photonRoute
   ↓
Web updates UI, shows alerts
   ↓
Repeat until 6 reversals
```

### 4. JCC Test Trial
```
Show two axis orientations
   ↓
User says "one" or "two"
   ↓
Web → POST /api/voice/intent (text)
   ↓
Detect choice (1 or 2)
   ↓
Web → POST /api/jcc/next (state, choice, latency)
   ↓
API advances JCC
   ↓
API → Grok (check signals)
   ↓
Return: newState, complete, result
   ↓
Web updates axis/cyl display
   ↓
Repeat until stage === "done"
```

### 5. Summary Generation
```
Both eyes complete (sphere + JCC)
   ↓
Web → POST /api/summary (sessionId, results)
   ↓
API saves Rx to SQLite
   ↓
Update session.state = "completed"
   ↓
Web displays Rx cards
   ↓
User can export CSV
```

---

## Database Schema

**Location**: `apps/api/src/db.ts`

### Tables

#### `sessions`
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  deviceInfo TEXT,
  distanceCm REAL,
  screenPpi REAL,
  lighting TEXT,
  state TEXT NOT NULL DEFAULT 'active'
);
```

#### `events`
```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sessionId TEXT NOT NULL,
  t INTEGER NOT NULL,
  step TEXT NOT NULL,
  lettersShown TEXT,
  speechText TEXT,
  correct INTEGER,
  latencyMs INTEGER,
  params TEXT,
  FOREIGN KEY (sessionId) REFERENCES sessions(id)
);
```

#### `rx`
```sql
CREATE TABLE rx (
  sessionId TEXT NOT NULL,
  eye TEXT NOT NULL,
  S REAL NOT NULL,
  C REAL NOT NULL,
  Axis REAL NOT NULL,
  VA_logMAR REAL,
  confidence REAL,
  PRIMARY KEY (sessionId, eye),
  FOREIGN KEY (sessionId) REFERENCES sessions(id)
);
```

---

## State Management

### Zustand Store

**Location**: `apps/web/src/store/testStore.ts`

**State Shape**:
```typescript
{
  // Session
  sessionId: string | null,
  stage: "idle" | "calibration" | "sphere_od" | ...,
  currentEye: "OD" | "OS",
  
  // Calibration
  calibrated: boolean,
  calibration: { pixelsPerCm, viewingDistanceCm, pixelsPerArcmin },
  
  // Staircase
  sphereState: { OD: StairState, OS: StairState },
  sphereResults: { OD: {...}, OS: {...} },
  
  // JCC
  jccState: { OD: JccState, OS: JccState },
  jccResults: { OD: {...}, OS: {...} },
  
  // UI
  showGrokHint: boolean,
  grokMessage: string,
  showPhotonAlert: boolean,
  photonMessage: string,
}
```

**Actions**: `setSessionId`, `setCalibration`, `setSphereState`, etc.

---

## API Endpoints

### Session
- `POST /api/session` — Create session
- `GET /api/session/:id` — Get session
- `PATCH /api/session/:id` — Update state

### Events
- `POST /api/event` — Log event
- `GET /api/event/:sessionId` — Get events

### Voice
- `POST /api/voice/tts` — Text-to-speech
- `POST /api/voice/stt` — Speech-to-text (multipart)
- `POST /api/voice/intent` — Detect intent

### Staircase
- `POST /api/staircase/init` — Initialize
- `POST /api/staircase/next` — Advance

### JCC
- `POST /api/jcc/init` — Initialize
- `POST /api/jcc/next` — Advance

### Summary
- `POST /api/summary` — Save Rx
- `GET /api/summary/:sessionId` — Get Rx
- `GET /api/summary/:sessionId/export` — Export CSV

---

## Performance Considerations

### Latency Targets
- **TTS**: < 800ms per prompt
- **STT**: < 1.5s per utterance
- **API calls**: < 200ms (local SQLite)

### Optimizations
- Canvas rendering (no React re-renders for optotypes)
- Zustand (minimal re-renders)
- SQLite WAL mode (concurrent reads)
- Mock fallbacks (no API wait times)

---

## Security

### API Keys
- Server-side only (never exposed to client)
- Environment variables
- Fallbacks for missing keys

### CORS
- Restricted to `FRONTEND_ORIGIN`
- Default: localhost (dev)

### Data Privacy
- Local SQLite (no cloud by default)
- No PII stored
- Session IDs: nanoid (random)

---

## Testing Strategy

### Unit Tests
- Core algorithms: `packages/core/src/*.test.ts`
- Staircase: reversal logic, threshold calculation
- JCC: axis/power refinement

### Integration Tests
- API endpoints: session, staircase, jcc
- Database: CRUD operations

### E2E Tests (Manual)
- Full test flow: calibration → sphere → JCC → summary
- Voice input: microphone, TTS playback
- AI alerts: Grok hints, Photon banners

---

## Deployment Architecture

### Local Development
```
pnpm dev
→ API: localhost:8787
→ Web: localhost:5173
→ DB: ./OptiX.sqlite
```

### Production (Vercel)
```
API (Serverless Function)
  ↓
Web (Static Hosting)
  ↓
SQLite (Vercel Postgres or file-based)
```

**Environment**:
- `FRONTEND_ORIGIN`: Production web URL
- `DATABASE_URL`: Connection string
- All API keys

---

## Extension Points

### Add New AI Service
1. Create wrapper in `packages/agent/src/`
2. Add endpoint in `apps/api/src/routes/`
3. Call from test flow
4. Add console log callout

### Add New Test Stage
1. Define state in `packages/core/src/types.ts`
2. Implement algorithm in `packages/core/src/`
3. Add API route
4. Create UI page component
5. Update Dedalus routing

### Add New Voice Command
1. Extend `detectIntent` in `packages/voice/src/gemini.ts`
2. Handle in UI (SphereTest, JCCTest)

---

**This architecture supports rapid iteration while maintaining production-grade code quality.**




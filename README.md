# Nearify Exam — Voice-First Subjective Refraction

A production-grade MVP for distance acuity and astigmatism testing using voice interaction.

## 🎯 Features

- **Voice-First UX**: Speak letters, make choices ("one or two?")
- **Adaptive Testing**: 1-up/2-down staircase + Jackson Cross Cylinder
- **AI-Powered Orchestration**:
  - ElevenLabs: Natural TTS prompts
  - Google Gemini: STT + function-calling policy
  - xAI Grok: Realtime confidence monitoring & reallocation
  - Photon: Hybrid fallback routing (easy/normal/abort)
  - Dedalus: Tool routing (calibrate/staircase/JCC/summary)
- **SQLite Persistence**: Session, events, and Rx storage
- **Pixel-Perfect Rendering**: Canvas-based optotypes (Sloan letters)

## 🏗️ Architecture

```
nearify-exam/
├── apps/
│   ├── web/          # Vite + React + TypeScript
│   └── api/          # Node + Express + TypeScript
├── packages/
│   ├── core/         # Shared types + algorithms
│   ├── agent/        # Dedalus, Photon, Grok wrappers
│   └── voice/        # ElevenLabs + Gemini clients
└── nearify.sqlite    # Local database
```

## 🚀 Quick Start

### Prerequisites

- Node.js ≥18
- pnpm ≥8

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Edit .env with your API keys
```

### Development

```bash
# Run both API and Web in parallel
pnpm dev

# Web UI: http://localhost:5173
# API: http://localhost:8787
```

### Build

```bash
pnpm build
```

## 🔑 API Keys

You'll need keys for:

1. **ElevenLabs** (TTS): https://elevenlabs.io
2. **Google Gemini** (STT + NLU): https://ai.google.dev
3. **xAI Grok** (Policy): https://x.ai
4. Photon & Dedalus are placeholder wrappers (can extend)

## 📊 Testing Flow

1. **Calibration**: Credit card sizing + distance measurement
2. **Sphere Test**: Voice-driven staircase for each eye
3. **JCC Astigmatism**: "One or two?" axis/power refinement
4. **Summary**: Final Rx with confidence scores

## 🎤 Voice Commands

- Read letters: "C D Z O P"
- Make choices: "One" or "Two"
- Navigation: "Next", "Skip", "Repeat"

## 🏆 Prize Integrations

- **Amazon**: Web Services infrastructure ready
- **ElevenLabs**: All prompts use natural voice
- **Gemini**: STT + function-calling policy
- **xAI**: Grok monitors confidence in realtime
- **Photon**: Hybrid routing for accessibility
- **Dedalus**: Agent-based tool orchestration
- **.tech**: Modern tech stack

## 📄 License

MIT



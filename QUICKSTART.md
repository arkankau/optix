# ⚡ Quick Start Guide

Get Nearify Exam running in 3 minutes!

## Step 1: Install Dependencies

```bash
cd eye-test

# Install pnpm (if not installed)
npm install -g pnpm

# Install all packages
pnpm install
```

## Step 2: Configure Environment

```bash
# Create .env file (optional - app works without API keys)
echo "ELEVENLABS_API_KEY=
GEMINI_API_KEY=
XAI_GROK_API_KEY=
PHOTON_API_KEY=
DEDALUS_API_KEY=
FRONTEND_ORIGIN=http://localhost:5173
PORT=8787
DATABASE_URL=file:./nearify.sqlite" > .env
```

> **Note**: The app works with mock responses if you don't have API keys!

## Step 3: Start Development Servers

```bash
# Start both API and Web in one command
pnpm dev
```

You'll see:
```
🚀 Nearify Exam API Server
📡 Listening on http://localhost:8787

🎤 Voice Integrations:
   - ElevenLabs TTS: ⚠️  Not configured (using mock)
   - Gemini STT/NLU: ⚠️  Not configured (using mock)
   - xAI Grok: ⚠️  Not configured (using fallback)
```

And:
```
VITE ready in XXX ms

➜  Local:   http://localhost:5173/
```

## Step 4: Open Browser

Navigate to: **http://localhost:5173**

Click **"Start Vision Test"** and follow the flow!

---

## 🎯 Test Flow

1. **Home** → Click "Start Vision Test"
2. **Calibration** → Adjust card width, set distance (60cm)
3. **Sphere Test** → Read letters for both eyes
4. **JCC Test** → Choose "one" or "two" for both eyes
5. **Summary** → See your Rx + export CSV

---

## 🎤 Voice Testing

### With Microphone
- Hold the "🎤 Hold to Speak" button
- Say letters: "C D Z O P"
- Or say "One" / "Two" for JCC

### Without Microphone
- Click the numbered buttons (1️⃣ One / 2️⃣ Two) for JCC
- Letter tests will use mock voice ("C D Z O P")

---

## 📊 Watch Console Logs

Open browser DevTools (F12) to see prize integration callouts:

```
🔊 Using ElevenLabs for prompt: "..."
🎤 Gemini parsed: "C D Z O P" (85%)
🤖 Grok suggestion: ...
⚡ Photon: Switching to EASIER mode
🎯 Dedalus routing: stage=sphere_od
📊 Generated Rx for session ...
```

---

## 🔑 Add Real API Keys (Optional)

Edit `.env`:

```bash
# Get keys from:
ELEVENLABS_API_KEY=your_key_here     # https://elevenlabs.io
GEMINI_API_KEY=your_key_here         # https://ai.google.dev
XAI_GROK_API_KEY=your_key_here       # https://x.ai
```

Then restart: `pnpm dev`

See `ENV_SETUP.md` for detailed instructions.

---

## 🐛 Troubleshooting

### "Module not found" errors
```bash
pnpm install
```

### Port already in use
```bash
# Kill processes on ports 5173 and 8787
lsof -ti:5173 | xargs kill -9
lsof -ti:8787 | xargs kill -9
```

### Can't build packages
```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

### Database locked
```bash
rm nearify.sqlite nearify.sqlite-journal
```

---

## 📁 Project Structure

```
eye-test/
├── apps/
│   ├── api/          ← Backend server (Port 8787)
│   └── web/          ← Frontend app (Port 5173)
├── packages/
│   ├── core/         ← Algorithms (staircase, JCC)
│   ├── agent/        ← AI routing (Grok, Photon, Dedalus)
│   └── voice/        ← Voice clients (ElevenLabs, Gemini)
├── nearify.sqlite    ← Auto-created database
├── package.json      ← Root workspace
└── pnpm-workspace.yaml
```

---

## 🚀 Next Steps

- Read `DEMO.md` for full demo script
- Check `README.md` for architecture details
- See `ENV_SETUP.md` for API key setup
- Explore `packages/*/src/` for implementation

---

**Ready! Start testing at http://localhost:5173** 👁️




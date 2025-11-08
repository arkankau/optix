# Environment Setup Guide

## Required API Keys

### 1. ElevenLabs (Text-to-Speech)
- **Website**: https://elevenlabs.io
- **Sign up**: Free tier available
- **Get key**: Dashboard → Profile → API Keys
- **Usage**: All voice prompts

```bash
ELEVENLABS_API_KEY=your_key_here
```

### 2. Google Gemini (STT + NLU)
- **Website**: https://ai.google.dev
- **Sign up**: Google AI Studio
- **Get key**: Get API Key → Create API Key
- **Usage**: Speech-to-text, intent detection

```bash
GEMINI_API_KEY=your_key_here
```

### 3. xAI Grok (Policy Advisor)
- **Website**: https://x.ai
- **Sign up**: Request API access
- **Get key**: Developer console
- **Usage**: Realtime test optimization

```bash
XAI_GROK_API_KEY=your_key_here
```

### 4. Photon (Optional - Has Fallback)
- **Purpose**: Hybrid routing wrapper
- **Fallback**: Rule-based routing if not set
- **Current**: Uses local logic

```bash
PHOTON_API_KEY=placeholder
```

### 5. Dedalus (Optional - Has Fallback)
- **Purpose**: Agent tool routing
- **Fallback**: State machine if not set
- **Current**: Uses local logic

```bash
DEDALUS_API_KEY=placeholder
```

## Setup Steps

1. **Copy environment file**:
```bash
cp .env.example .env
```

2. **Edit `.env`** and add your keys

3. **Minimum viable setup** (for demo):
   - `ELEVENLABS_API_KEY` — For TTS (recommended)
   - `GEMINI_API_KEY` — For STT (recommended)
   - Others can use fallbacks

4. **Restart server** after updating:
```bash
# Stop dev server (Ctrl+C)
pnpm dev
```

## Verification

When you start the API, you'll see:

```
🚀 Nearify Exam API Server
📡 Listening on http://localhost:8787
🌐 CORS enabled for http://localhost:5173

🎤 Voice Integrations:
   - ElevenLabs TTS: ✅
   - Gemini STT/NLU: ✅
   - xAI Grok: ✅
```

- ✅ = API key configured
- ⚠️ = Using fallback (still works, just mocked)

## Testing Without API Keys

The app works without any API keys using:
- **Mock TTS**: Silent audio (logs "Mock TTS")
- **Mock STT**: Returns "C D Z O P" (logs "Mock STT")
- **Mock Grok**: Rule-based hints
- **Local Photon/Dedalus**: Always available

This allows judges to run the demo even without API access.

## Production Deployment

For Vercel/production:

1. **Add environment variables** in Vercel dashboard
2. **Add these additional vars**:
   ```
   FRONTEND_ORIGIN=https://your-web-url.vercel.app
   PORT=8787
   DATABASE_URL=file:./nearify.sqlite
   ```

3. **Database**: Use Vercel Postgres or keep SQLite for demo

## Security Notes

- Never commit `.env` to git (already in `.gitignore`)
- Rotate keys if exposed
- Use environment-specific keys (dev/prod)
- Server-side only (never expose in client)

## Cost Estimates (Free Tiers)

- **ElevenLabs**: 10,000 characters/month free
- **Gemini**: 60 requests/minute free
- **Grok**: Check xAI pricing
- **Hosting**: Vercel free tier sufficient

## Troubleshooting

### "API key not set" warnings
- Normal if keys not added yet
- App uses fallbacks automatically

### CORS errors
- Check `FRONTEND_ORIGIN` matches your web URL
- Default: `http://localhost:5173`

### TTS not playing
- Check browser console for errors
- Try different browser (Chrome recommended)
- Ensure microphone permissions granted

### STT not working
- Grant microphone access when prompted
- Check HTTPS (required for mic access in production)
- Test with button clicks instead (JCC)

---

**Ready to go! Run `pnpm dev` and start testing.**


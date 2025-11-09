# 👁️ Eye Chart Integration - Complete Guide

## ✅ What's Been Integrated

### 1. **Fixed Snellen Eye Chart Component**
   - Location: `apps/web/src/components/FixedLettersChart.tsx`
   - Features:
     - Displays static Snellen chart PNG image
     - Highlights current line with blue indicator
     - Supports scaling for different viewing distances
     - Maps lines 1-11 to visual acuity (20/200 to best)

### 2. **Updated Sphere Test Flow**
   - Location: `apps/web/src/pages/SphereTest.tsx`
   - Changes:
     - **Removed**: Dynamic letter generation (staircase algorithm)
     - **Added**: Fixed eye chart with line-by-line progression
     - **Added**: ElevenLabs Conversational AI widget integration
     - **Added**: Automatic diopter value calculation from chart lines
   
### 3. **ElevenLabs Widget Integration**
   - Location: `apps/web/src/components/ElevenLabsWidget.tsx`
   - Features:
     - Embedded conversational AI agent
     - Bidirectional message handling
     - Ready state callback
     - Custom event listeners

### 4. **Astigmatism Test Images**
   - Location: `apps/web/src/components/AstigmatismImage.tsx`
   - Features:
     - 3 random pattern types: radial, grid, fan
     - SVG-based, scalable
     - Randomly selected each test

## 🔄 New Test Flow

### Sphere Test (for each eye):

1. **Setup**:
   - Patient covers one eye
   - Fixed Snellen chart displayed
   - ElevenLabs AI agent activates

2. **Conversation**:
   - AI: "Hello! Let's test your [right/left] eye. Please cover your [opposite] eye."
   - AI guides patient through chart line by line
   - Patient reads letters aloud
   - AI evaluates responses and moves to next line

3. **Completion**:
   - AI determines best line patient can read
   - System calculates sphere value from line number:
     ```typescript
     Line 1 (20/200) → logMAR 1.0  → ~-1.50 D
     Line 2 (20/100) → logMAR 0.7  → ~-1.00 D
     Line 3 (20/70)  → logMAR 0.54 → ~-0.75 D
     Line 4 (20/50)  → logMAR 0.4  → ~-0.50 D
     Line 5 (20/40)  → logMAR 0.3  → ~-0.25 D
     Line 6 (20/30)  → logMAR 0.18 → ~-0.25 D
     Line 7 (20/25)  → logMAR 0.1  → Plano
     Line 8+ (20/20) → logMAR ≤0.0 → Plano (normal)
     ```

4. **Next Step**:
   - If OD complete → move to OS
   - If OS complete → move to astigmatism test (JCC)

### Astigmatism Test:

1. Random pattern image displayed (radial/grid/fan)
2. Patient evaluates clarity/distortion
3. JCC algorithm refines axis and cylinder
4. Final values: Cylinder + Axis

## 📊 Final Output

After both tests complete, the system returns:

```json
{
  "OD": {
    "sphere": -0.75,
    "cylinder": -0.50,
    "axis": 180,
    "VA_logMAR": 0.0,
    "confidence": 0.85
  },
  "OS": {
    "sphere": -1.00,
    "cylinder": -0.25,
    "axis": 90,
    "VA_logMAR": 0.1,
    "confidence": 0.80
  }
}
```

This matches standard optometry prescription format:
- **Sphere (S)**: Myopia/hyperopia correction
- **Cylinder (C)**: Astigmatism correction
- **Axis**: Astigmatism orientation (0-180°)

## 🎯 ElevenLabs Agent System Prompt

Your agent should be configured with this prompt:

```
You are a friendly eye test assistant. Your role is to guide patients through a Snellen eye chart test, one line at a time.

Instructions:
1. Start by greeting the patient and asking them to cover one eye
2. Ask them to read each line of letters from the chart
3. Start from the top (line 1, largest letters)
4. If they read correctly, move to the next smaller line
5. If they struggle or make errors, note that line as their limit
6. Be encouraging and patient
7. When they've reached their smallest readable line, thank them and confirm completion

Key phrases to use:
- "Great job! Let's try the next line down."
- "Take your time, just read what you can see clearly."
- "That's excellent! Your vision for this eye is complete."
- "Now let's test your other eye."

Never:
- Rush the patient
- Make medical diagnoses
- Provide prescription values (the system calculates these)
```

## ⚠️ Setup Required

### CRITICAL: Save the Eye Chart Image

You **must** save your Snellen eye chart PNG to:

```
apps/web/public/assets/eye-chart.png
```

**Without this image, the sphere test will not display properly.**

### Verify ElevenLabs Agent ID

Current agent ID in code:
```
agent_0801k9h75d11eh2bjnwsmkn9t932
```

Confirm this matches your ElevenLabs dashboard.

## 🚀 Testing the Integration

1. **Save the eye chart image** (see above)
2. **Start the app** (if not already running):
   ```bash
   pnpm dev
   ```
3. **Navigate through the flow**:
   - Home → Calibration → Sphere Test (OD) → Sphere Test (OS) → Astigmatism Test (JCC) → Summary

4. **Expected behavior**:
   - Eye chart displays with all 11 lines
   - ElevenLabs widget appears inline
   - AI voice guides through the test
   - Blue highlight moves down the chart
   - Final summary shows diopter values

## 📁 Modified Files

### Frontend Components:
- ✅ `apps/web/src/components/FixedLettersChart.tsx` - New chart component
- ✅ `apps/web/src/components/ElevenLabsWidget.tsx` - Widget wrapper
- ✅ `apps/web/src/components/AstigmatismImage.tsx` - Random patterns
- ✅ `apps/web/src/pages/SphereTest.tsx` - Updated test flow

### Backend (unchanged for this feature):
- API routes remain the same
- ElevenLabs Conversational AI handled client-side

## 🎨 UI/UX Improvements

The new flow provides:
- **More realistic**: Uses actual Snellen chart (clinical standard)
- **Voice-first**: Natural conversation with AI agent
- **Visual feedback**: Line highlighting shows progress
- **Professional**: Matches real optometry exam experience

## 🔮 Future Enhancements

1. **Dynamic line highlighting from AI**: AI could control which line is highlighted
2. **Confidence scoring**: Track how many letters per line are correct
3. **Adaptive testing**: Skip lines if patient clearly sees smaller ones
4. **Multi-language**: ElevenLabs supports multiple languages
5. **Results export**: PDF prescription output

---

**Ready to test!** Just save your eye chart image and reload the app. 🚀




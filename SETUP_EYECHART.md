# Eye Chart Setup Instructions

## 📋 Quick Setup

You need to save the eye chart image to use in the sphere test.

### Step 1: Save the Eye Chart Image

Save the Snellen eye chart PNG image as:

```
/Users/arkanfadhilkautsar/Downloads/eye-test/apps/web/public/assets/eye-chart.png
```

### Step 2: Verify the Image

The image should contain:
- Line 1: E (20/200)
- Line 2: F P (20/100)
- Line 3: T O Z (20/70)
- Line 4: L P E D (20/50)
- Line 5: P E C F D (20/40)
- Line 6: E D F C Z P (20/30) - green line marker
- Line 7: F E L O P Z D (20/25)
- Line 8: D E F P O T E C (20/20) - red line marker
- Lines 9-11: Smaller text

### Step 3: Restart the App

Once saved, the app will automatically load the image in the sphere test.

## 🎯 How It Works

The `FixedLettersChart` component will:
1. Display the static eye chart image
2. Highlight the current line being tested with a blue indicator
3. Scale appropriately for the viewing distance
4. Work with the ElevenLabs AI agent to guide the user through each line

## ✅ Current Integration

- ✅ Fixed chart component ready
- ✅ ElevenLabs widget embedded
- ✅ Line-by-line progression logic
- ✅ Diopter value calculation from chart lines
- ⚠️ Need to save eye-chart.png to public/assets/

## 🚀 Next Steps

After saving the image:
1. Navigate to the sphere test
2. The ElevenLabs agent will guide you through the chart
3. The AI will determine which lines you can read
4. Final output will be the diopter values (sphere, cylinder, axis) for each eye



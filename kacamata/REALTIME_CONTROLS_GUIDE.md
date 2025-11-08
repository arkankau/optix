# Real-Time Controls Guide

## Overview

I've added real-time parameter controls so you can adjust the correction on-the-fly while the app is running. This is especially useful for finding the right settings for your -4.00D myopia.

## Controls Available

### 1. **Regularization (λ) Slider**
- **Range**: 0.001 to 0.1
- **Default**: 0.02
- **What it does**: Controls the balance between sharpness and artifacts
  - **Lower values (0.001-0.01)**: Sharper correction but may have more artifacts/ringing
  - **Medium values (0.01-0.03)**: Balanced (recommended starting point)
  - **Higher values (0.03-0.1)**: Smoother, less artifacts but less correction

**For -4.00D myopia, try:**
- Start with 0.02 (default)
- If too blurry: decrease to 0.01-0.015
- If too sharp/artifacts: increase to 0.03-0.05

### 2. **Correction Strength Slider**
- **Range**: 0.0x to 2.0x
- **Default**: 1.0x (normal)
- **What it does**: Multiplies your prescription to apply stronger/weaker correction
  - **0.0x**: No correction (off)
  - **0.5x**: Half correction (useful for testing)
  - **1.0x**: Normal correction (matches your prescription)
  - **1.5x-2.0x**: Stronger correction (may help if correction seems weak)

**For -4.00D myopia, try:**
- Start with 1.0x
- If correction seems too weak: increase to 1.2x-1.5x
- If over-corrected: decrease to 0.8x-0.9x

### 3. **Contrast Boost Slider**
- **Range**: 0.8x to 1.3x
- **Default**: 1.0x (no boost)
- **What it does**: Adds additional contrast enhancement
  - **0.8x-0.9x**: Reduces contrast (softer image)
  - **1.0x**: No additional boost
  - **1.1x-1.3x**: Increases contrast (sharper appearance)

**Tips:**
- Start with 1.0x (no boost)
- If image looks flat: increase to 1.05x-1.1x
- If too contrasty/harsh: decrease to 0.9x-0.95x

## Recommended Settings for -4.00D Myopia

Since you mentioned the correction doesn't seem strong enough, try these settings:

1. **Initial Setup:**
   - Regularization (λ): 0.015-0.02
   - Correction Strength: 1.2x-1.5x (to compensate for potential under-correction)
   - Contrast Boost: 1.0x-1.05x

2. **If still not clear enough:**
   - Increase Correction Strength to 1.5x-2.0x
   - Decrease Regularization to 0.01 (sharper)
   - Increase Contrast Boost slightly to 1.1x

3. **If too sharp/artifacts:**
   - Decrease Correction Strength to 1.0x
   - Increase Regularization to 0.03-0.05 (smoother)
   - Decrease Contrast Boost to 0.9x-1.0x

## Understanding the Issue

If the research paper's example doesn't look clear even with pre-correction, there could be a few reasons:

1. **PSF Computation**: The blur amount might not match your actual vision
2. **Viewing Distance**: Make sure your viewing distance is set correctly (typically 50-70cm for desktop)
3. **Display PPI**: Ensure your display PPI is correct in the profile
4. **Correction Strength**: The correction might need to be stronger (use the slider!)

## Troubleshooting

### Correction seems too weak:
- Increase **Correction Strength** to 1.5x-2.0x
- Decrease **Regularization** to 0.01-0.015
- Check that your prescription is entered correctly (-4.00D)

### Image looks broken/artifacts:
- Increase **Regularization** to 0.03-0.05
- Decrease **Correction Strength** to 1.0x
- Decrease **Contrast Boost** to 0.9x

### Image looks too contrasty:
- Decrease **Contrast Boost** to 0.9x-0.95x
- Increase **Regularization** slightly

### Correction works but not strong enough:
- Increase **Correction Strength** slider (this is the key!)
- Verify your prescription is correct
- Check viewing distance settings

## Real-Time Adjustment

All sliders update in real-time as you move them. You can:
1. Watch the split-screen view to see before/after
2. Adjust sliders while viewing
3. Find the sweet spot for your vision
4. Settings are applied immediately (no need to restart)

## Important Notes

- **Correction Strength** is the most important parameter if correction seems weak
- **Regularization** controls the tradeoff between sharpness and artifacts
- **Contrast Boost** is fine-tuning - use sparingly
- For -4.00D, you may need Correction Strength > 1.0x to get good results

## Next Steps

1. Start the app with your -4.00D profile
2. Use the **Correction Strength** slider - try 1.5x first
3. Adjust **Regularization** if you see artifacts
4. Fine-tune with **Contrast Boost** if needed
5. Save your preferred settings once you find them

The real-time controls should help you find the right balance for your vision!


# Fixes Applied for Image Quality Issues

## Problems Identified

1. **Aggressive Contrast Boost**: Post-processing was applying `1.15 + lambda * 10` contrast boost, causing over-amplification
2. **Inverse Kernel Normalization**: Inverse kernels from Wiener filter could have extreme values causing artifacts
3. **Lambda Too Small**: Default lambda of 0.008 was too small, causing over-sharpening and ringing artifacts
4. **Precision Loss**: Using Uint8Array for intermediate calculations caused precision loss

## Fixes Applied

### 1. Reduced Contrast Boost (`wiener-engine.ts`)
**Before:**
```typescript
const contrastBoost = 1.15 + lambda * 10; // Could be 1.23+ with lambda=0.008
```

**After:**
```typescript
const contrastBoost = 1.0 + Math.min(0.1, lambda * 2); // Max 1.1x boost
```

- Reduced from potentially 1.23x to maximum 1.1x
- Wiener filter already does most of the correction work
- Only minimal boost to compensate for slight darkening

### 2. Kernel Value Clamping (`wiener-engine.ts`)
**Added:**
- Limit kernel values to maximum 5.0 to prevent extreme amplification
- Better normalization of inverse kernels
- Fallback to identity kernel if filter is unstable

```typescript
const max_kernel_value = 5.0; // Prevent kernels from being too extreme
const scale_h = Math.min(1.0, max_kernel_value / max_abs_h);
```

### 3. Increased Default Lambda (`runtime-adapter.ts`)
**Before:**
```typescript
const { horiz, vert } = WienerEngine.generateSeparableInverse(psf, 0.008);
```

**After:**
```typescript
const baseLambda = 0.02; // More conservative default
const adaptiveLambda = Math.max(0.01, Math.min(0.1, baseLambda));
```

- Increased from 0.008 to 0.02 (2.5x increase)
- More conservative regularization prevents over-amplification
- Clamped between 0.01 and 0.1 for safety

### 4. Improved Precision (`wiener-engine.ts`)
**Before:**
```typescript
const temp = new Uint8Array(input.length);
// ... calculations with immediate clamping
temp[out_idx] = Math.min(255, Math.max(0, r));
```

**After:**
```typescript
const temp = new Float32Array(input.length);
// ... calculations preserving precision
// Clamp only at final output with proper rounding
output[out_idx] = Math.min(255, Math.max(0, Math.round(r)));
```

- Use Float32Array for intermediate calculations
- Preserve precision through convolution
- Round only at final output stage

### 5. Better Fallback Handling
**Before:**
- Fallback created sharpening kernel that could be too aggressive

**After:**
- Fallback returns identity kernel (no correction) if filter is unstable
- Prevents artifacts when Wiener filter computation fails

## Expected Results

After these fixes:
- ✅ Reduced contrast amplification (max 1.1x instead of 1.23x+)
- ✅ Clamped kernel values to prevent extreme amplification
- ✅ More conservative lambda (0.02 vs 0.008) reduces ringing
- ✅ Better precision in calculations
- ✅ Safer fallback behavior

## Testing Recommendations

1. **Test with different prescriptions**:
   - Mild myopia (-1.0D to -2.0D)
   - Moderate myopia (-2.0D to -4.0D)
   - With and without astigmatism

2. **Adjust lambda if needed**:
   - If still too sharp/artifacts: increase lambda to 0.03-0.05
   - If too soft/not enough correction: decrease lambda to 0.015-0.02
   - Use the "Too Blurry/Too Sharp" feedback controls

3. **Check for**:
   - Reduced contrast artifacts
   - Less ringing/halos around edges
   - More natural-looking correction
   - Better image quality overall

## Further Optimization (If Needed)

If issues persist, consider:
1. **Adaptive lambda based on blur amount**: Larger blur → higher lambda
2. **Tone mapping**: Apply gentle S-curve instead of linear contrast boost
3. **Edge-aware processing**: Reduce correction strength near edges to prevent halos
4. **Multi-scale approach**: Apply different lambda at different frequency bands


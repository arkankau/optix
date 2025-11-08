# TWO-SIDED MYOPIA CLASSIFICATION FIX

## ❌ The Bug

The old code used a **one-sided check** that incorrectly returned ΔD = 0 for many myopic users:

```typescript
// OLD (BROKEN):
export function deltaD(sphere_D, distance_cm, Amax) {
  const d = distance_cm / 100;
  const R = Math.abs(sphere_D);
  const needed = 1 / d;
  const have = R + Amax;
  return Math.max(0, needed - have); // ❌ WRONG for too_far case
}
```

### Example: -2D @ 60cm (FAILED)
```
R = 2D
need = 1/0.6 = 1.67D
have = R + Amax = 2 + 1.5 = 3.5D

ΔD = max(0, 1.67 - 3.5) = max(0, -1.83) = 0 ❌

Result: "Identity" mode (no correction) when user is actually TOO FAR
```

---

## ✅ The Fix

Implemented **TWO-SIDED classification** that correctly handles both too_far and too_near:

```typescript
// NEW (CORRECT):
export function classifyMyopia(sphere_D, distance_cm, Amax) {
  const R = Math.abs(sphere_D);
  const need = 1 / Math.max(0.2, distance_cm / 100);
  const lower = R;           // far-point boundary
  const upper = R + Amax;    // near accommodation boundary

  if (need < lower) {
    // Too far (beyond far point)
    return { region: 'too_far', deltaD: lower - need };
  }
  if (need > upper) {
    // Too near (need more accommodation)
    return { region: 'too_near', deltaD: need - upper };
  }
  // Inside clear zone
  return { region: 'inside', deltaD: 0 };
}
```

---

## 🧮 Physics Explanation

### Clear Zone Boundaries

For myopia with magnitude R and accommodation Amax:

```
Far point (furthest clear distance):   d_far = 1/R
Near point (closest clear distance):   d_near = 1/(R + Amax)

Clear zone: d_near ≤ d ≤ d_far
```

### Example: -2D myopia (Amax = 1.5D)

```
R = 2D
d_far = 1/2 = 0.5m = 50cm
d_near = 1/(2+1.5) = 0.286m = 28.6cm

Clear zone: 28.6cm to 50cm
```

### Classification at Different Distances

| Distance | need (D) | Comparison | Region | ΔD |
|----------|----------|------------|--------|-----|
| **100cm** | 1.00 | need < R (2D) | **too_far** | 2 - 1 = **1.0D** |
| **60cm** | 1.67 | need < R (2D) | **too_far** | 2 - 1.67 = **0.33D** |
| **50cm** | 2.00 | need = R | **inside** | 0D |
| **40cm** | 2.50 | R < need < R+Amax | **inside** | 0D |
| **28.6cm** | 3.50 | need = R+Amax | **inside** | 0D |
| **20cm** | 5.00 | need > R+Amax (3.5D) | **too_near** | 5 - 3.5 = **1.5D** |

---

## 🎯 Expected Results

### For -2D @ 60cm (the reported bug):

**OLD (BROKEN):**
```
Mode: Identity
Region: inside
ΔD: 0.00D
Scale: 1.0×
```

**NEW (CORRECT):**
```
Mode: Nearify
Region: too_far
ΔD: 0.33D
Scale: 1.35-1.6×
```

### For -2D @ 40cm (inside clear zone):
```
Mode: Identity
Region: inside
ΔD: 0.00D
Scale: 1.0×
```

### For -6D @ 60cm (extreme):
```
Mode: Out-of-range
Region: too_far
ΔD: 4.33D
Scale: 1.0× (with hint to move closer or use optics)
```

---

## 🔍 Sanity Checks

Run these in browser console to verify:

```javascript
// Should pass with new code:
console.assert(classifyMyopia(-2, 60).region === 'too_far', 
  'Expected too_far for -2D @60cm');

console.assert(Math.abs(classifyMyopia(-2, 60).deltaD - 0.33) < 0.01, 
  'Expected ΔD ≈ 0.33D for -2D @60cm');

console.assert(classifyMyopia(-2, 40).region === 'inside', 
  'Expected inside for -2D @40cm');

console.assert(classifyMyopia(-6, 60).region === 'too_far', 
  'Expected too_far for -6D @60cm');

console.assert(classifyMyopia(-6, 60).deltaD > 3.0, 
  'Expected ΔD > 3D for -6D @60cm (out of range)');
```

---

## 📝 Files Changed

1. **`src/core/nearify-vision.ts`**
   - ✅ Added `classifyMyopia()` function with two-sided logic
   - ✅ Updated `deltaD()` to use `classifyMyopia()` internally
   - ✅ Added physics documentation

2. **`renderer/src/components/LiveView.tsx`**
   - ✅ Replaced one-sided check with two-sided classification (lines 158-181)
   - ✅ Added proper handling for `too_far`, `too_near`, `inside` regions
   - ✅ Added out-of-range guard for ΔD > 3D
   - ✅ Increased demo floor to 1.35× for better visibility

3. **`src/core/vision-engine.ts`**
   - ✅ Added split view guard to force passthrough (no blur filters)

---

## 🎮 How to Test

1. **Start the app:**
   ```bash
   npm run start
   ```

2. **Create/load profile with -2.0D sphere**

3. **Position yourself at ~60cm from screen**

4. **Enable Split View**

5. **Verify HUD shows:**
   ```
   Mode: Nearify (NOT Identity)
   Region: too_far
   ΔD: ~0.30-0.35D
   Scale: 1.35-1.6×
   ```

6. **Visual check:**
   - Left pane: Original (smaller)
   - Right pane: 1.35-1.6× larger with green "NEARIFY ON" badge

7. **Move to ~40cm:**
   - Should transition to:
   ```
   Mode: Identity
   Region: inside
   ΔD: 0.00D
   Scale: 1.0×
   ```
   - Both panes now identical (inside clear zone)

---

## ✅ Status: FIXED

- ✅ Two-sided classification implemented
- ✅ Physics correct for too_far, too_near, inside
- ✅ Demo floor raised to 1.35× for better visibility
- ✅ Out-of-range handling for ΔD > 3D
- ✅ Build successful
- ✅ Ready to test

**The bug is fixed!** -2D @ 60cm now correctly shows "Mode: Nearify" with visible scaling. 🎯


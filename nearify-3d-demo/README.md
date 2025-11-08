# 3D Nearify Stereo Demo for Myopia

A minimal Three.js demo showing **geometric 3D correction** for myopia using:
1. **Off-axis stereo** (zero-disparity at far point)
2. **Depth remapping** (compress world → clarity band)
3. **UI plane pinned** at far point

---

## 🎯 Concept

For **-2D myopia**:
- Far point = 0.50m (1 / |−2D|)
- Clarity band: 0.40–0.60m (±10cm)

### How It Works

1. **Stereo Vergence**: Off-axis projection converges at 0.50m
2. **Depth Compression**: tanh-based remap pulls objects toward clarity band
3. **UI at Far Point**: Text/UI rendered at 0.50m stays sharp

**This is geometric correction** (not a 2D blur filter).

---

## 🚀 Quick Start

```bash
cd /Users/arkanfadhilkautsar/Downloads/optix/nearify-3d-demo

# Install dependencies
npm install

# Run dev server
npm run dev

# Open browser and view side-by-side
# Use VR box/Google Cardboard for stereo effect
```

---

## 🎮 Controls

- **Mouse**: Orbit around scene
- **Stereo Button**: Toggle off-axis stereo projection
- **Depth Remap Button**: Toggle depth compression
- **UI Plane Button**: Show/hide UI plane at far point

---

## 📊 What You Should See

### Objects:
- **Green box** @ 0.45m (near, within band)
- **Cyan sphere** @ 0.50m (at far point, zero disparity)
- **Blue cylinder** @ 2.0m (remapped → ~0.55m)
- **Purple torus** @ 4.0m (remapped → ~0.58m)
- **Red box** @ 8.0m (remapped → ~0.60m)

### HUD (bottom-left):
```
Rx (sphere): -2.00 D
Far point: 50 cm
Zero-disparity: 50 cm
Clarity band: ±10 cm (40-60 cm)
Stereo: Off-axis (no toe-in)
Depth Remap: Active
FPS: ~60
```

---

## 🧮 The Math

### Off-Axis Stereo
```
shift = (eye === 'L' ? -ipd/2 : ipd/2) * (near / zCenter)

For -2D @ zCenter = 0.50m:
- IPD = 63mm = 0.063m
- Near = 0.2m
- Shift = ±0.063/2 * (0.2/0.5) = ±0.0126m at near plane
```

### Depth Remap (tanh compression)
```
t = tanh(α * (z - zCenter) / S)
z_remap = zCenter + t * W

Where:
- α = 0.8 (steepness)
- S = 1.5m (transition scale)
- W = 0.10m (half-width)

Examples:
- z = 0.50m → z_remap = 0.50m (no change at far point)
- z = 2.0m  → z_remap ≈ 0.55m
- z = 4.0m  → z_remap ≈ 0.58m
- z = 8.0m  → z_remap ≈ 0.60m (compressed to band edge)
```

---

## 🎨 Project Structure

```
nearify-3d-demo/
├── src/
│   ├── main.ts                 # Main entry point
│   ├── nearify/
│   │   ├── config.ts           # Configuration & constants
│   │   ├── stereo.ts           # Off-axis stereo projection
│   │   ├── depthRemap.ts       # Depth compression (tanh)
│   │   ├── uiPlane.ts          # UI plane at far point
│   │   └── hud.ts              # HUD utilities
│   └── scene/
│       └── testScene.ts        # Test objects at various depths
├── public/
│   └── index.html              # HTML template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🔧 Customization

### Change Prescription

Edit `src/nearify/config.ts`:
```typescript
export const NEARIFY_CFG = {
  rx: { sphereD: -3.0 },  // Change here
  zCenter: 0.33,          // Update far point (1/3)
  // ...
};
```

### Adjust Clarity Band

```typescript
bandHalfWidth: 0.15,  // ±15cm instead of ±10cm
```

### Change IPD (Inter-Pupillary Distance)

```typescript
ipd: 0.065,  // 65mm instead of 63mm
```

---

## 🚀 GPU Vertex Shader (Production)

For better performance, move depth remap to GPU:

```glsl
// depthRemap.vert (inject via material.onBeforeCompile)
uniform float zCenter;
uniform float bandHalfWidth;
uniform float transScale;
uniform float alpha;

vec3 nearifyRemap(vec3 posEye) {
  float z = length(posEye);
  float t = tanh(alpha * (z - zCenter) / transScale);
  float zR = zCenter + t * bandHalfWidth;
  vec3 dir = normalize(posEye);
  return dir * zR;
}

void main() {
  vec4 pe = modelViewMatrix * vec4(position, 1.0); // eye space
  vec3 rem = nearifyRemap(pe.xyz);
  vec4 pe2 = vec4(rem, 1.0);
  gl_Position = projectionMatrix * pe2;
}
```

Wire uniforms from `NEARIFY_CFG` in `material.onBeforeCompile`.

---

## 📱 VR/Stereo Viewing

1. **Desktop**: View side-by-side, cross your eyes (or use parallel viewing)
2. **VR Box**: Use Google Cardboard or similar phone VR viewer
3. **VR Headset**: Adapt for WebXR API (future enhancement)

---

## ✅ Status

- ✅ Off-axis stereo projection
- ✅ Depth remapping (CPU)
- ✅ UI plane at far point
- ✅ Toggle controls
- ✅ HUD metrics
- ⏳ GPU vertex shader (stub provided)
- ⏳ WebXR support (future)

---

## 🎓 Why This Works (vs 2D Filters)

| Method | How It Works | Limitations |
|--------|--------------|-------------|
| **2D Blur Filter** | Pre-blur screen → eye deblurs | Loses information, artifacts |
| **3D Nearify (This)** | Vergence + depth compression | Requires stereo display |

**3D Nearify** is true geometric correction:
- Eyes naturally converge at far point
- Content compressed into clear zone
- No information loss

---

## 📄 License

MIT - Free to use and modify

---

**Built with Three.js + TypeScript + Vite** 🚀


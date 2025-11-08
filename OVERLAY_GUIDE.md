# Clarity - GPU-Accelerated Desktop Overlay for Vision Correction

Transform your display into corrective lenses with real-time GPU processing. Like Clue.ly or Discord overlay, but for vision correction.

## 🚀 Quick Start

```bash
cd kacamata
npm install
npm run build
npm start
```

## ✨ What's New - Overlay Mode

The app now runs as an **always-on-top transparent overlay** that processes your entire desktop in real-time:

- **Fullscreen Overlay**: Transparent window that sits on top of everything
- **GPU Accelerated**: WebGL2 shaders for 60+ FPS processing
- **System Tray**: Control the app from your system tray
- **Control Panel**: Separate floating window for adjustments
- **Hotkeys**: 
  - `Ctrl+Shift+O` - Toggle overlay
  - `Ctrl+Shift+C` - Open control panel

## 📋 Architecture

### Overlay Mode (New!)
```
┌─────────────────────────────────────┐
│   Transparent Overlay Window        │  ← Always on top
│   (Fullscreen, click-through)       │
│                                     │
│   [GPU Processing via WebGL2]       │
│   Desktop Capture → PSF → Render    │
│                                     │
│   Stats: 60 FPS | 16ms | 50cm      │
└─────────────────────────────────────┘

┌──────────────────┐
│ Control Panel    │  ← Floating window
│ - Myopia: -4.0D  │
│ - Distance: 60cm │
│ - Sharpness      │
│ [Apply Settings] │
└──────────────────┘

System Tray: [👓] Clarity
  ├─ Show/Hide Overlay
  ├─ Control Panel
  └─ Quit
```

### Components

1. **Main Process** (`src/main.ts`)
   - Window management (overlay, control panel, tray)
   - System tray integration
   - Global shortcuts
   - IPC handlers

2. **Overlay Window** (`renderer/src/components/LiveView.tsx`)
   - Transparent fullscreen canvas
   - Desktop capture via desktopCapturer
   - GPU processing pipeline
   - Minimal UI overlay

3. **Control Panel** (`renderer/src/components/ControlPanel.tsx`)
   - Compact settings interface
   - Profile management
   - Real-time parameter adjustment

4. **GPU Processor** (`renderer/src/gpu-processor.ts`)
   - WebGL2 compute shaders
   - Wiener deconvolution filter
   - 60+ FPS at 1080p/1440p

## 🎯 How It Works

```
Desktop Capture (desktopCapturer)
    ↓
Canvas (hidden) ← Draw captured frame
    ↓
GPU Processing (WebGL2)
    ├─ Upload to texture
    ├─ Apply PSF deconvolution shader
    └─ Render to processed canvas
    ↓
Overlay Window (transparent, fullscreen)
    └─ Display corrected output
```

## 🔧 Development

See `kacamata/` directory for full project details.

## 📄 License

MIT

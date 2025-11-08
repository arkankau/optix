# Clarity - Quick Start Guide

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Start the app:
```bash
npm start
```

## Development Mode

Run in development mode with hot reload:
```bash
npm run dev
```

This will:
- Watch and compile TypeScript for the main process
- Start Vite dev server for the renderer process
- Launch Electron with DevTools open

## First Run

1. **Onboarding**: Choose between:
   - **Self-Test** (60-90s calibration) - Coming soon
   - **Manual Entry** - Enter your prescription

2. **Enter Prescription**:
   - Sphere (Diopters): e.g., `-2.00` for myopia
   - Cylinder (Optional): e.g., `-0.75` for astigmatism
   - Axis (Optional): `0-180` degrees
   - Viewing Distance: Default `60cm`

3. **Live View**:
   - Toggle processing ON/OFF
   - Use split-screen to compare before/after
   - Adjust with "Too Blurry" / "Too Sharp" buttons

## Hotkeys

- `Ctrl+E` (or `Cmd+E` on Mac): Toggle full-screen overlay
- `Ctrl+S` (or `Cmd+S` on Mac): Toggle split-screen mode
- `Ctrl+R` (or `Cmd+R` on Mac): Recalibrate

## Features

### Screen Capture
- Uses Electron's `desktopCapturer` API
- Captures primary display
- Real-time processing at 45+ FPS (target)

### Distance Tracking
- Webcam-based face detection via MediaPipe Face Mesh
- Estimates eye-to-screen distance
- Automatically adjusts correction strength
- Smooths with exponential moving average

### Vision Processing
- PSF (Point Spread Function) computation from diopter/distance
- Wiener deconvolution for anti-blur
- Adjustable regularization parameter (λ)
- Contrast boost for MTF compensation

## Troubleshooting

### Screen Capture Not Working
- Ensure screen recording permissions are granted
- On macOS: System Preferences → Security & Privacy → Screen Recording
- On Windows: Check Windows privacy settings

### Webcam Not Working
- Grant camera permissions when prompted
- Check system privacy settings
- Distance tracking will fallback to default (60cm) if unavailable

### Performance Issues
- CPU-based processing is used as fallback (GPU path requires native addon)
- Lower resolution or disable distance tracking if needed
- Check FPS/latency in the controls panel

## Next Steps

For production deployment:
1. Add native desktop capture (D3D11/CGDisplayStream) for better performance
2. Implement GPU-accelerated processing (WebGPU/Metal/DirectX)
3. Add self-test calibration flow
4. Optimize for 60 FPS at 1080p

## Notes

- This is an MVP (v0.1.0)
- Medical disclaimer: This is an accessibility aid, not medical advice
- Consult your optometrist for proper vision care


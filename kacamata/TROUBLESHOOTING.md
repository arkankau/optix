# Troubleshooting Guide - Overlay Black Screen & Performance Issues

## Problem: Black Screen in Overlay Mode

### Causes & Solutions

#### 1. **Desktop Capture Permissions** (Most Common)
**Symptoms:** Black screen, no FPS counter updating
**Fix:**
- **Windows:** Check Screen Recording permissions in Settings > Privacy
- **macOS:** System Preferences > Security & Privacy > Screen Recording
  - Add the app to allowed applications
  - Restart the app

#### 2. **No Profile Created**
**Symptoms:** Black screen with "Waiting for profile" in console
**Fix:**
1. Open the app normally (not overlay mode)
2. Complete the onboarding wizard
3. Create a profile with your prescription
4. Then try overlay mode

#### 3. **Canvas Not Rendering**
**Symptoms:** Black canvas, console shows video errors
**Fix:**
- Open Dev Tools (F12) and check console for errors
- Look for "desktopCapturer" errors
- Verify video element is receiving data

## Problem: Very Laggy / Low FPS

### Quick Fixes

#### 1. **Turn OFF Processing First**
```
1. Click the "Filter OFF" button in overlay
2. You should see your desktop passthrough (no lag)
3. If still laggy, it's a capture issue, not processing
```

#### 2. **Use Fast Mode**
```
1. Turn Filter ON
2. Click "Fast Mode" button (green)
3. This uses simple CPU sharpening (60+ FPS)
4. "Full Mode" (orange) uses complex Wiener deconvolution (slower)
```

#### 3. **Reduce Resolution**
```
// In main.ts, reduce overlay window size for testing
overlayWindow = new BrowserWindow({
  width: 1280,  // Instead of fullscreen
  height: 720,
  // ...
});
```

### Performance Modes

| Mode | FPS @ 1080p | FPS @ 1440p | Quality | CPU Usage |
|------|-------------|-------------|---------|-----------|
| **Passthrough** (Filter OFF) | 60 | 60 | Original | <5% |
| **Fast Mode** | 50-60 | 40-50 | Good | 10-20% |
| **Full Mode** | 20-30 | 10-15 | Best | 40-60% |

## Problem: Screen Doesn't Update

### Checks

1. **Video Element Status**
   - Open Dev Tools console
   - Look for "Video is playing!" message
   - If missing, video isn't playing

2. **Canvas Loop Running**
   - Console should show "Frames processed: 60" every second
   - If not, capture loop isn't running

3. **requestAnimationFrame Issues**
   - Check if window is minimized (pauses RAF)
   - Check if another app is blocking rendering

## Debugging Steps

### Step 1: Check Video Capture
```javascript
// Open Dev Tools Console
// Paste this:
const video = document.querySelector('video');
console.log('Video:', video);
console.log('Ready State:', video?.readyState);
console.log('Video Size:', video?.videoWidth, 'x', video?.videoHeight);
console.log('Paused:', video?.paused);
```

Expected output:
```
Ready State: 4
Video Size: 1920 x 1080
Paused: false
```

### Step 2: Check Canvas
```javascript
const canvas = document.querySelectorAll('canvas');
console.log('Canvases:', canvas.length);
canvas.forEach((c, i) => {
  console.log(`Canvas ${i}:`, c.width, 'x', c.height);
  const ctx = c.getContext('2d');
  const pixel = ctx.getImageData(0, 0, 1, 1);
  console.log(`Pixel ${i}:`, pixel.data);
});
```

Expected: At least one canvas with non-zero dimensions and non-black pixel

### Step 3: Force Passthrough Mode
```javascript
// In LiveView.tsx, temporarily set:
const [isProcessing, setIsProcessing] = useState(false);
const [useFastCPU, setUseFastCPU] = useState(true);
```

## Common Issues & Quick Fixes

### Issue: "No screen sources available"
**Fix:** Restart Electron app, grant permissions

### Issue: Canvas shows but it's black
**Fix:** 
1. Check if video is playing (`video.play()`)
2. Verify video has data (`video.readyState >= 2`)
3. Try different capture source

### Issue: Processing works but super slow
**Fix:**
1. Use Fast Mode (button in overlay)
2. Reduce myopia strength (less processing needed)
3. Turn off split-screen mode

### Issue: Overlay not always-on-top
**Fix:**
```typescript
// In main.ts, ensure:
overlayWindow.setAlwaysOnTop(true, 'screen-saver', 1);
```

## Performance Optimization Tips

### 1. **Start Simple**
- Begin with Filter OFF
- Verify you can see your desktop
- Then enable Fast Mode
- Only use Full Mode if needed

### 2. **Reduce Canvas Size**
```typescript
// In startCaptureLoop(), add:
const targetWidth = Math.min(1920, video.videoWidth);
const targetHeight = Math.min(1080, video.videoHeight);
```

### 3. **Skip Frames**
```typescript
// Process every other frame
if (frameCount % 2 === 0) {
  // process
} else {
  // copy original
}
```

### 4. **Use Lower Profile Settings**
- Lower myopia value (-2D instead of -6D)
- Increase lambda (less aggressive sharpening)
- Disable LFD mode

## Testing Procedure

1. **Start with passthrough:**
   ```
   npm start
   Press Ctrl+Shift+O to open overlay
   Verify you see "Filter OFF" button
   Click it - you should see your desktop
   ```

2. **Enable Fast Mode:**
   ```
   Click "Filter ON"
   Should auto-start in Fast Mode (green)
   FPS should be 40-60
   ```

3. **Try Full Mode (optional):**
   ```
   Click "Full Mode" button (orange)
   FPS will drop to 20-30
   Better quality but slower
   ```

## Log Analysis

### Good Log (Working):
```
Starting screen capture...
Screen sources: [...]
Got media stream: MediaStream
Video metadata loaded: 1920 x 1080
Video is playing!
Starting capture loop...
Canvas size set to: 1920 x 1080
First frame drawn, test pixel: Uint8ClampedArray [...]
Frames processed: 60
```

### Bad Log (Not Working):
```
Starting screen capture...
No screen sources available  ❌
```
OR
```
Video metadata loaded: 0 x 0  ❌
```
OR
```
Waiting for video data. Ready state: 0  ❌
```

## Emergency Reset

If everything breaks:

1. **Clear app data:**
   ```
   Windows: %APPDATA%\clarity
   macOS: ~/Library/Application Support/clarity
   ```

2. **Rebuild:**
   ```bash
   cd kacamata
   rm -rf node_modules dist
   npm install
   npm run build
   npm start
   ```

3. **Test in normal window first:**
   - Don't use overlay mode
   - Test capture in the regular window
   - Enable split-screen to see before/after

## Contact & Support

If you've tried everything:
1. Open Dev Tools (F12)
2. Copy all console output
3. Check for any red errors
4. Note your OS, GPU, screen resolution
5. Share in GitHub issues

## Quick Reference: Modes

| Mode | Button | Performance | Use Case |
|------|--------|-------------|----------|
| **OFF** | Red | 60 FPS | Debugging, see original |
| **Fast** | Green | 50+ FPS | Daily use, good enough |
| **Full** | Orange | 20-30 FPS | Best quality, demo mode |

---

**Remember:** Start with Filter OFF, make sure you can see your desktop, then enable Fast Mode!

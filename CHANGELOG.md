# Changelog

## Latest Updates - Click-Through & Console Logging

### ✅ Fixed Issues

#### 1. **Click-Through Enabled**
- The overlay is now fully click-through for transparent areas
- You can interact with applications underneath the overlay
- Control bar and parameter display remain interactive when visible
- Uses `setIgnoreMouseEvents(true, { forward: true })` to allow clicks through transparent areas

#### 2. **Console Logging Added**
All parameter changes and toggle actions now log to console:

```
🔵 Sphere changed: -2.50
🟢 Cylinder changed: -0.75
🟡 Axis changed: 90°
📐 Parameters changed: { sphere: '-2.50', cylinder: '-0.75', axis: '90°' }
👁️ Overlay visibility toggled: VISIBLE
🔄 Toggle button clicked - Current state: true
🎮 Toggle control bar triggered from shortcut
```

#### 3. **Keyboard Shortcuts Fixed**
- `Ctrl + Shift + C` - Toggle control bar (now working)
- `Ctrl + Shift + W` - Close app (now working)

**What was fixed:**
- Shortcuts now register after window loads (timing fix)
- Added console logging to confirm registration
- Unregister all shortcuts before re-registering to avoid conflicts
- Added null checks to prevent crashes
- Dev tools automatically open to see console output

### Changes Made

#### `electron/main.js`
- Enabled click-through by default: `setIgnoreMouseEvents(true, { forward: true })`
- Register shortcuts after window finishes loading
- Added registration success/failure logging
- Added console logs for shortcut presses
- Auto-open dev tools in development mode

#### `src/App.jsx`
- Added console logging for all parameter changes
- Added logging for overlay visibility toggles
- Added logging for control bar show/hide
- Maintains click-through at all times

#### `src/components/ControlBar.jsx`
- Added console logs for each slider change:
  - Sphere slider: `🔵 Sphere changed: X.XX`
  - Cylinder slider: `🟢 Cylinder changed: X.XX`
  - Axis slider: `🟡 Axis changed: XXX°`
- Added logging for toggle button clicks

### How to Test

1. **Start the app:**
```bash
npm run electron:dev
```

2. **Test Click-Through:**
   - Open any application behind the overlay
   - Try clicking through the transparent areas - it should work!
   - The control bar and parameter display are still clickable

3. **Test Console Logging:**
   - Dev tools will open automatically
   - Press `Ctrl + Shift + C` to open control bar
   - Move sliders - watch console for logged values
   - Click toggle button - watch console for visibility changes

4. **Test Keyboard Shortcuts:**
   - Press `Ctrl + Shift + C` - control bar should appear/disappear
   - Press `Ctrl + Shift + W` - app should close
   - Check console for "Successfully registered" messages on startup

### Console Output Examples

**On Startup:**
```
Global shortcuts registered
Successfully registered Ctrl+Shift+C
Successfully registered Ctrl+Shift+W
Setting up keyboard shortcut listener
📐 Parameters changed: { sphere: '0.00', cylinder: '0.00', axis: '0°' }
```

**When Using Sliders:**
```
🔵 Sphere changed: -2.50
📐 Parameters changed: { sphere: '-2.50', cylinder: '0.00', axis: '0°' }
📊 Parameters updated from main process: { sphere: -2.5, cylinder: 0, axis: 0 }
```

**When Pressing Ctrl+Shift+C:**
```
Ctrl+Shift+C pressed - toggling control bar
🎮 Toggle control bar triggered from shortcut
Control bar: showing
🖱️ Control bar visible - click-through maintained
```

### Technical Details

**Click-Through Implementation:**
- Uses `pointer-events: none` on container
- Uses `pointer-events: auto` on visible elements
- Electron's `setIgnoreMouseEvents(true, { forward: true })` forwards mouse events to windows below

**Shortcut Registration:**
- Waits for `did-finish-load` event before registering
- Uses `CommandOrControl` for cross-platform compatibility
- Clears all shortcuts before re-registering to avoid conflicts

**Console Logging:**
- Uses emoji prefixes for easy identification
- Logs both individual changes and aggregated state
- Logs IPC communication between processes



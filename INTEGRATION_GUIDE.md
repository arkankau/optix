# Integration Guide for Vision Test App

This guide explains how to integrate the Optical Overlay App with your vision test application.

## Architecture Overview

The overlay app uses Electron's IPC (Inter-Process Communication) to communicate between the main process and the renderer process. This same architecture can be extended to communicate with your vision test app.

## Integration Methods

### Method 1: Direct IPC Integration (Recommended)

If your vision test app is also an Electron app, you can communicate directly via IPC.

#### Step 1: Add IPC Handlers in Vision Test App

In your vision test app's main process, add:

```javascript
const { ipcMain } = require('electron');

// Send detected parameters to overlay app
function sendParametersToOverlay(sphere, cylinder, axis) {
  // Get reference to overlay window
  const overlayWindow = BrowserWindow.fromId(overlayWindowId);
  if (overlayWindow) {
    overlayWindow.webContents.send('set-parameters-external', {
      sphere,
      cylinder,
      axis
    });
  }
}

// Call this when your vision test detects parameters
ipcMain.on('vision-test-complete', (event, results) => {
  sendParametersToOverlay(
    results.sphere,
    results.cylinder,
    results.axis
  );
});
```

#### Step 2: Update Overlay App to Receive External Parameters

Add to `electron/preload.js`:

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing methods ...
  
  // New method for external parameter updates
  onSetParametersExternal: (callback) => {
    ipcRenderer.on('set-parameters-external', (event, params) => {
      callback(params);
    });
  }
});
```

Add to `src/App.jsx`:

```javascript
useEffect(() => {
  if (window.electronAPI && window.electronAPI.onSetParametersExternal) {
    window.electronAPI.onSetParametersExternal(({ sphere, cylinder, axis }) => {
      setSphere(sphere);
      setCylinder(cylinder);
      setAxis(axis);
    });
  }
}, []);
```

### Method 2: File-Based Communication

Use a shared JSON file for communication.

#### In Vision Test App:

```javascript
const fs = require('fs');
const path = require('path');

function saveParametersToFile(sphere, cylinder, axis) {
  const configPath = path.join(app.getPath('userData'), 'optical-params.json');
  fs.writeFileSync(configPath, JSON.stringify({ sphere, cylinder, axis }));
}
```

#### In Overlay App (`electron/main.js`):

```javascript
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

// Watch for parameter file changes
function watchParameterFile() {
  const configPath = path.join(app.getPath('userData'), 'optical-params.json');
  
  fs.watch(configPath, (eventType) => {
    if (eventType === 'change') {
      const params = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      mainWindow.webContents.send('set-parameters-external', params);
    }
  });
}

// Call after window creation
app.whenReady().then(() => {
  createWindow();
  watchParameterFile();
});
```

### Method 3: HTTP/WebSocket Communication

For separate applications or web-based vision tests.

#### In Overlay App (`electron/main.js`):

```javascript
import express from 'express';

const app = express();
app.use(express.json());

app.post('/api/parameters', (req, res) => {
  const { sphere, cylinder, axis } = req.body;
  
  if (mainWindow) {
    mainWindow.webContents.send('set-parameters-external', {
      sphere,
      cylinder,
      axis
    });
  }
  
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('Overlay API listening on port 3000');
});
```

#### In Vision Test App (any platform):

```javascript
// JavaScript/Node.js
fetch('http://localhost:3000/api/parameters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sphere: -2.5, cylinder: -0.75, axis: 90 })
});

// Python
import requests
requests.post('http://localhost:3000/api/parameters', 
  json={'sphere': -2.5, 'cylinder': -0.75, 'axis': 90})
```

## Data Format Specification

All parameter exchange should follow this format:

```typescript
interface OpticalParameters {
  sphere: number;      // Range: -20.00 to +20.00, step: 0.25
  cylinder: number;    // Range: -10.00 to +10.00, step: 0.25
  axis: number;        // Range: 0 to 180, step: 1 (degrees)
}
```

### Example:
```json
{
  "sphere": -2.50,
  "cylinder": -0.75,
  "axis": 90
}
```

## Launching Both Apps Together

### Option 1: Parent Process Launch

In your vision test app:

```javascript
const { spawn } = require('child_process');
const path = require('path');

function launchOverlayApp() {
  const overlayPath = path.join(__dirname, '../overlay-app/optical-overlay-app.exe');
  const overlayProcess = spawn(overlayPath, [], { detached: true });
  overlayProcess.unref();
}

// Launch overlay when vision test starts
app.on('ready', () => {
  launchOverlayApp();
  // ... rest of your app initialization
});
```

### Option 2: Batch Script (Windows)

Create `launch-both.bat`:

```batch
@echo off
start "" "path\to\vision-test-app.exe"
timeout /t 2 /nobreak
start "" "path\to\optical-overlay-app.exe"
```

### Option 3: Shell Script (macOS/Linux)

Create `launch-both.sh`:

```bash
#!/bin/bash
./vision-test-app &
sleep 2
./optical-overlay-app &
```

## Environment Configuration

Create a `.env` file in the overlay app root:

```env
# Development
NODE_ENV=development
VITE_API_PORT=3000

# Production
# NODE_ENV=production
```

Access in code:

```javascript
const API_PORT = import.meta.env.VITE_API_PORT || 3000;
```

## Testing Integration

### Test Script Example

Create `test-integration.js`:

```javascript
// Simulates vision test sending parameters
function simulateVisionTest() {
  const testParameters = [
    { sphere: -2.50, cylinder: -0.75, axis: 90 },
    { sphere: -1.00, cylinder: -1.25, axis: 180 },
    { sphere: 0.00, cylinder: 0.00, axis: 0 },
  ];

  let index = 0;
  setInterval(() => {
    const params = testParameters[index % testParameters.length];
    
    fetch('http://localhost:3000/api/parameters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    }).then(() => {
      console.log('Sent parameters:', params);
    });
    
    index++;
  }, 3000); // Update every 3 seconds
}

simulateVisionTest();
```

## Security Considerations

### 1. Validate Parameters

Always validate incoming parameters:

```javascript
function validateParameters({ sphere, cylinder, axis }) {
  if (sphere < -20 || sphere > 20) throw new Error('Invalid sphere');
  if (cylinder < -10 || cylinder > 10) throw new Error('Invalid cylinder');
  if (axis < 0 || axis > 180) throw new Error('Invalid axis');
  return true;
}
```

### 2. Secure IPC Channels

Use context isolation (already enabled):

```javascript
// electron/main.js
webPreferences: {
  contextIsolation: true,  // ✓ Already enabled
  nodeIntegration: false,  // ✓ Already disabled
}
```

### 3. CORS Configuration (if using HTTP)

```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'POST, GET');
  next();
});
```

## Packaging for Distribution

When packaging both apps together:

1. **Create installer structure:**
```
installer/
├── vision-test-app/
├── optical-overlay-app/
└── setup.exe
```

2. **Create unified installer script:**

Using Electron Builder, create `builder.config.js`:

```javascript
module.exports = {
  extraResources: [
    {
      from: './optical-overlay-app',
      to: 'optical-overlay-app'
    }
  ],
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  }
}
```

## Troubleshooting

### Issue: Parameters not updating

**Solution:** Check IPC channel names match exactly:
```javascript
// Sender
send('set-parameters-external', data)

// Receiver  
on('set-parameters-external', callback)
```

### Issue: Overlay app doesn't receive messages

**Solution:** Ensure overlay window is created before sending:
```javascript
if (mainWindow && !mainWindow.isDestroyed()) {
  mainWindow.webContents.send(...)
}
```

### Issue: CORS errors with HTTP method

**Solution:** Enable CORS or use same-origin requests

## Example: Complete Integration Flow

```
Vision Test App                    Overlay App
     |                                  |
     |  1. User starts test             |
     |                                  |
     |  2. Test detects parameters     |
     |     (sphere, cylinder, axis)    |
     |                                  |
     |  3. Send via IPC/HTTP           |
     | -------------------------------->|
     |                                  |
     |                            4. Receive params
     |                                  |
     |                            5. Update state
     |                                  |
     |                            6. Re-render UI
     |                                  |
     |  7. User sees live overlay      |
     |     with detected values        |
```

## Next Steps

1. Choose integration method based on your architecture
2. Implement IPC handlers in both apps
3. Test with mock data first
4. Validate parameter ranges
5. Package both apps together

For questions or issues, refer to the main README.md or create an issue in the repository.


# Optical Overlay App

A transparent Electron overlay application built with React and Vite that displays optical parameters (sphere, cylinder, axis) on top of all windows.

## Features

- **Transparent Always-On-Top Overlay**: Sits on top of all windows with a transparent background
- **Real-time Parameter Display**: Shows sphere, cylinder, and axis values in the top-left corner
- **Interactive Control Bar**: Hidden control panel with sliders to adjust parameters in real-time
- **Global Keyboard Shortcuts**:
  - `Ctrl + Shift + C`: Toggle control bar visibility
  - `Ctrl + Shift + W`: Close application
- **Click-through Support**: Automatically enables/disables click-through based on control bar visibility
- **Draggable Control Bar**: Move the control panel anywhere on screen
- **Beautiful UI**: Modern design with gradient accents and smooth animations

## Tech Stack

- **Electron**: Desktop application framework
- **React**: UI library
- **Vite**: Fast build tool and dev server
- **ES Modules**: Modern JavaScript module system

## Installation

1. Install dependencies:
```bash
npm install
```

## Development

Run the app in development mode:

```bash
npm run electron:dev
```

This will:
1. Start the Vite dev server on `http://localhost:5173`
2. Launch the Electron app once the server is ready
3. Enable hot-reload for React components

## Building for Production

1. Build the React app:
```bash
npm run build
```

2. Build the Electron app:
```bash
npm run electron:build
```

The built application will be in the `dist` folder.

## Project Structure

```
optical-overlay-app/
├── electron/
│   ├── main.js          # Electron main process
│   └── preload.js       # IPC bridge (context isolation)
├── src/
│   ├── components/
│   │   ├── Overlay.jsx       # Parameter display component
│   │   ├── Overlay.css
│   │   ├── ControlBar.jsx    # Control panel with sliders
│   │   └── ControlBar.css
│   ├── App.jsx          # Main React component
│   ├── App.css
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── package.json
└── README.md
```

## Usage

### Keyboard Shortcuts

- **`Ctrl + Shift + C`**: Toggle the control bar on/off
- **`Ctrl + Shift + W`**: Close the application

### Control Bar

The control bar contains:
- **Sphere Slider**: Range from -20.00 to 20.00 (step 0.25) - for myopia/hyperopia
- **Cylinder Slider**: Range from -10.00 to 10.00 (step 0.25) - for astigmatism
- **Axis Slider**: Range from 0° to 180° (step 1°) - angle in degrees
- **Toggle Overlay Button**: Show/hide the parameter display

### Overlay Display

The overlay shows in the top-left corner:
- Sphere value (with 2 decimal places)
- Cylinder value (with 2 decimal places)
- Axis value (in degrees)

All values update in real-time as you adjust the sliders.

## Integration with Vision Test App

This app is designed to be easily portable and integrated with a vision test application. Here's how:

### 1. IPC Communication

The app already has IPC channels set up:

```javascript
// In your vision test app, you can send parameters via IPC:
window.electronAPI.updateParameters({ sphere, cylinder, axis });
```

### 2. Receiving Parameters from External App

To receive parameters from your vision test app, add this to `electron/main.js`:

```javascript
ipcMain.on('set-parameters-from-vision-test', (event, { sphere, cylinder, axis }) => {
  mainWindow.webContents.send('update-parameters-from-external', { sphere, cylinder, axis });
});
```

And in `src/App.jsx`:

```javascript
useEffect(() => {
  if (window.electronAPI) {
    window.electronAPI.onUpdateParametersFromExternal(({ sphere, cylinder, axis }) => {
      setSphere(sphere);
      setCylinder(cylinder);
      setAxis(axis);
    });
  }
}, []);
```

### 3. Export/Import Configuration

The parameter state can be easily exported as JSON:

```javascript
const config = { sphere, cylinder, axis };
// Save to file or send to parent app
```

### 4. Files to Modify for Integration

- **`electron/preload.js`**: Add new IPC channels for communication
- **`src/App.jsx`**: Add listeners for external parameter updates
- **`electron/main.js`**: Add IPC handlers for bidirectional communication

## Customization

### Change Parameter Ranges

Edit the slider ranges in `src/components/ControlBar.jsx`:

```javascript
<input
  type="range"
  min="-20"  // Change min value
  max="20"   // Change max value
  step="0.25" // Change step size
  ...
/>
```

### Modify Window Properties

Edit window settings in `electron/main.js`:

```javascript
new BrowserWindow({
  transparent: true,    // Transparency
  alwaysOnTop: true,   // Always on top
  skipTaskbar: false,  // Show/hide in taskbar
  // ... other options
})
```

### Styling

- **Overlay**: Modify `src/components/Overlay.css`
- **Control Bar**: Modify `src/components/ControlBar.css`
- **Global Styles**: Modify `src/index.css`

## Troubleshooting

### App doesn't start in development
- Make sure port 5173 is not in use
- Try running `npm run dev` first to see if Vite starts correctly

### Click-through not working
- Check `electron/main.js` - ensure `setIgnoreMouseEvents` is called correctly
- On some systems, you may need to adjust window flags

### Shortcuts not working
- Make sure the app has focus
- Check if other apps are using the same shortcuts
- Try different key combinations in `electron/main.js`

## License

MIT


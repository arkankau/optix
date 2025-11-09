import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: false, // Set to true to hide from taskbar
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Make window full screen but not truly fullscreen (so it stays transparent)
  mainWindow.maximize();

  // Enable click-through for transparent areas, but allow clicking on visible elements
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Load the app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools(); // Open dev tools to see console
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Register global shortcuts after window is loaded
  mainWindow.webContents.once('did-finish-load', () => {
    registerShortcuts();
    console.log('Global shortcuts registered');
  });
}

function registerShortcuts() {
  // Unregister all shortcuts first to avoid conflicts
  globalShortcut.unregisterAll();

  // Ctrl+Shift+C: Toggle control bar
  const shortcut1 = globalShortcut.register('CommandOrControl+Shift+C', () => {
    console.log('Ctrl+Shift+C pressed - toggling control bar');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('toggle-control-bar');
    }
  });
  
  if (shortcut1) {
    console.log('Successfully registered Ctrl+Shift+C');
  } else {
    console.error('Failed to register Ctrl+Shift+C');
  }

  // Ctrl+Shift+W: Close app
  const shortcut2 = globalShortcut.register('CommandOrControl+Shift+W', () => {
    console.log('Ctrl+Shift+W pressed - closing app');
    app.quit();
  });
  
  if (shortcut2) {
    console.log('Successfully registered Ctrl+Shift+W');
  } else {
    console.error('Failed to register Ctrl+Shift+W');
  }
}

// IPC handlers
ipcMain.on('set-click-through', (event, enabled) => {
  if (mainWindow) {
    // Always keep click-through enabled, but allow interaction with control bar
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    console.log('Click-through maintained (always enabled)');
  }
});

ipcMain.on('update-parameters', (event, parameters) => {
  // This can be used to persist parameters or communicate with other processes
  console.log('📊 Parameters updated from main process:', parameters);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});


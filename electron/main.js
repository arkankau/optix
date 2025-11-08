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

  // Enable click-through when overlay is inactive (can be toggled)
  // Initially, we want clicks to go through the transparent parts
  mainWindow.setIgnoreMouseEvents(false); // Set to true for full click-through

  // Load the app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools(); // Uncomment for debugging
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Register global shortcuts
  registerShortcuts();
}

function registerShortcuts() {
  // Ctrl+Shift+C: Toggle control bar
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    mainWindow.webContents.send('toggle-control-bar');
  });

  // Ctrl+Shift+W: Close app
  globalShortcut.register('CommandOrControl+Shift+W', () => {
    app.quit();
  });
}

// IPC handlers
ipcMain.on('set-click-through', (event, enabled) => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(enabled, { forward: true });
  }
});

ipcMain.on('update-parameters', (event, parameters) => {
  // This can be used to persist parameters or communicate with other processes
  console.log('Parameters updated:', parameters);
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


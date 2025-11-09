import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let eyeTestWindow;
let eyeTestProcess = null;
let prescriptionWatcher = null;

const rootDir = path.resolve(__dirname, '..');
const overlayDevUrl = 'http://localhost:5123';
const eyeTestDir = path.join(rootDir, 'eye-test-app');
const eyeTestResultsDir = path.join(eyeTestDir, 'results');
const prescriptionFile = path.join(eyeTestResultsDir, 'latest-prescription.json');

function readLatestPrescription() {
  try {
    if (!fs.existsSync(prescriptionFile)) {
      return null;
    }
    const raw = fs.readFileSync(prescriptionFile, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('❌ Failed to read prescription file:', error);
    return null;
  }
}

function broadcastPrescription() {
  const data = readLatestPrescription();
  if (data && mainWindow && !mainWindow.isDestroyed()) {
    console.log('📡 Broadcasting updated prescription to renderer');
    mainWindow.webContents.send('eye-test:updated', data);
  }
}

function ensurePrescriptionWatcher() {
  if (prescriptionWatcher) return;

  if (!fs.existsSync(eyeTestResultsDir)) {
    fs.mkdirSync(eyeTestResultsDir, { recursive: true });
  }

  try {
    prescriptionWatcher = fs.watch(eyeTestResultsDir, (eventType, filename) => {
      if (filename === 'latest-prescription.json') {
        console.log('📁 Detected prescription file change');
        broadcastPrescription();
      }
    });
    console.log('👀 Watching for prescription updates in', eyeTestResultsDir);
  } catch (error) {
    console.error('❌ Failed to watch prescription directory:', error);
  }
}

function stopPrescriptionWatcher() {
  if (prescriptionWatcher) {
    prescriptionWatcher.close();
    prescriptionWatcher = null;
  }
}

async function isEyeTestRunning() {
  try {
    const response = await fetch('http://localhost:5173/', { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureEyeTestProcess() {
  if (await isEyeTestRunning()) {
    console.log('🔁 Eye test server already running on port 5173');
    return;
  }

  if (eyeTestProcess && !eyeTestProcess.killed) {
    return;
  }

  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  eyeTestProcess = spawn(command, ['dev'], {
    cwd: eyeTestDir,
    shell: false,
    env: { ...process.env },
  });

  eyeTestProcess.stdout.on('data', (data) => {
    console.log(`[EyeTest] ${data.toString().trim()}`);
  });

  eyeTestProcess.stderr.on('data', (data) => {
    console.error(`[EyeTest:err] ${data.toString().trim()}`);
  });

  eyeTestProcess.on('close', (code) => {
    console.log(`👁️ Eye test process exited with code ${code}`);
    eyeTestProcess = null;
  });
}

function openEyeTestWindow() {
  if (eyeTestWindow && !eyeTestWindow.isDestroyed()) {
    eyeTestWindow.focus();
    return;
  }

  eyeTestWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'OptiX Eye Test',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const eyeTestUrl = 'http://localhost:5173';
  eyeTestWindow.loadURL(eyeTestUrl);
  eyeTestWindow.on('closed', () => {
    eyeTestWindow = null;
  });
}

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
    mainWindow.loadURL(overlayDevUrl);
    // Don't open DevTools automatically - logs go to terminal
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Register global shortcuts immediately (don't wait for page load)
  registerShortcuts();
  console.log('✅ Global shortcuts registered immediately');
  
  // Also log when page finishes loading
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('✅ Page finished loading');
  });

  ensurePrescriptionWatcher();
  broadcastPrescription();
}

function registerShortcuts() {
  // Unregister all shortcuts first to avoid conflicts
  globalShortcut.unregisterAll();
  console.log('📋 Registering shortcuts...');

  // Ctrl+Shift+C: Toggle control bar
  console.log('🔧 Attempting to register Ctrl+Shift+C...');
  const shortcut1 = globalShortcut.register('CommandOrControl+Shift+C', () => {
    console.log('🔥 Ctrl+Shift+C pressed - toggling control bar');
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('📤 Sending toggle-control-bar to renderer');
      mainWindow.webContents.send('toggle-control-bar');
      console.log('✅ Event sent successfully');
    } else {
      console.error('❌ mainWindow is null or destroyed');
    }
  });
  
  console.log('🔍 Shortcut1 registration result:', shortcut1);
  
  if (shortcut1) {
    console.log('✅ Successfully registered Ctrl+Shift+C');
  } else {
    console.error('❌ Failed to register Ctrl+Shift+C - shortcut may already be taken by another app');
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
    if (enabled) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
      console.log('🪟 Overlay set to click-through (pass-through enabled)');
    } else {
      mainWindow.setIgnoreMouseEvents(false);
      console.log('🪟 Overlay interactions enabled');
    }
  }
});

ipcMain.on('update-parameters', (event, parameters) => {
  // This can be used to persist parameters or communicate with other processes
  console.log('📊 Parameters updated from main process:', parameters);
});

ipcMain.handle('eye-test:start', async () => {
  console.log('🟢 Launching eye test pipeline');
  await ensureEyeTestProcess();
  ensurePrescriptionWatcher();
  openEyeTestWindow();
  return readLatestPrescription();
});

ipcMain.handle('eye-test:get-results', async () => {
  return readLatestPrescription();
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
  stopPrescriptionWatcher();
  if (eyeTestProcess && !eyeTestProcess.killed) {
    eyeTestProcess.kill();
  }
});


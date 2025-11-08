import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Send messages to main process
  setClickThrough: (enabled) => ipcRenderer.send('set-click-through', enabled),
  updateParameters: (parameters) => ipcRenderer.send('update-parameters', parameters),
  
  // Receive messages from main process
  onToggleControlBar: (callback) => {
    ipcRenderer.on('toggle-control-bar', callback);
  },
  
  // Cleanup listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});


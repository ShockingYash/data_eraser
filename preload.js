const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Drive operations
  getDrives: () => ipcRenderer.invoke('get-drives'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // Wipe operations
  simulateWipe: (driveInfo) => ipcRenderer.invoke('simulate-wipe', driveInfo),
  
  // Certificate operations
  generateCertificate: (wipeData) => ipcRenderer.invoke('generate-certificate', wipeData),
  openCertificateFolder: () => ipcRenderer.invoke('open-certificate-folder'),
  
  // Event listeners
  onWipeProgress: (callback) => ipcRenderer.on('wipe-progress', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // Utility
  isElectron: true
});

// Remove listeners on window unload
window.addEventListener('beforeunload', () => {
  ipcRenderer.removeAllListeners('wipe-progress');
});

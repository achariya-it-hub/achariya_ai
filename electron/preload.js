const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  retryConnection: () => ipcRenderer.invoke('retry-connection'),
  isDesktop: true,
  platform: process.platform,
});


const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),
  get:      (key, def) => ipcRenderer.invoke('store-get', key, def),
  set:      (key, val) => ipcRenderer.invoke('store-set', key, val),
  openUrl:  (url) => ipcRenderer.send('open-external', url),
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),
  openUrl:  (url) => ipcRenderer.send('open-external', url),

  get: (key, def) => ipcRenderer.invoke('store-get', key, def),
  set: (key, val) => ipcRenderer.invoke('store-set', key, val),

  pickJava:          () => ipcRenderer.invoke('pick-java'),
  pickMcDir:         () => ipcRenderer.invoke('pick-mc-dir'),
  getMcDir:          () => ipcRenderer.invoke('get-mc-dir'),

  mcVersions:        () => ipcRenderer.invoke('mc-versions'),
  installedVersions: () => ipcRenderer.invoke('installed-versions'),
  installVersion:    (id) => ipcRenderer.invoke('install-version', id),
  launchMc:          (opts) => ipcRenderer.invoke('launch-mc', opts),

  onInstallStatus:    (cb) => ipcRenderer.on('install-status', (_e, msg) => cb(msg)),
  onDownloadProgress: (cb) => ipcRenderer.on('download-progress', (_e, d) => cb(d)),
  removeInstallListeners: () => {
    ipcRenderer.removeAllListeners('install-status');
    ipcRenderer.removeAllListeners('download-progress');
  },
});

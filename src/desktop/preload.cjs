const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('roundtableDesktop', {
  bootstrap: () => ipcRenderer.invoke('roundtable:bootstrap'),
  exportMeeting: id => ipcRenderer.invoke('roundtable:export', id),
});

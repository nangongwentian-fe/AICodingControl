const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  // 文件操作
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
  readDir: (dirPath) => ipcRenderer.invoke('dir:read', dirPath),
  readDirFiles: (dirPath) => ipcRenderer.invoke('dir:readFiles', dirPath),
  pathExists: (targetPath) => ipcRenderer.invoke('path:exists', targetPath),
  copyDir: (sourcePath, targetPath) => ipcRenderer.invoke('dir:copy', sourcePath, targetPath),
  removeDir: (targetPath) => ipcRenderer.invoke('dir:remove', targetPath),
  getDataDir: () => ipcRenderer.invoke('app:getDataDir'),
  getHomeDir: () => ipcRenderer.invoke('app:getHomeDir'),
  // AI 工具配置
  getAiTools: () => ipcRenderer.invoke('app:getAiTools'),
  saveAiTools: (config) => ipcRenderer.invoke('app:saveAiTools', config),
});

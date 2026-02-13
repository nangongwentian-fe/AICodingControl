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
  // 打开外部链接
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  // 在系统文件资源管理器中打开路径
  openPath: (targetPath) => ipcRenderer.invoke('shell:openPath', targetPath),
  // 软链接操作
  createSymlink: (target, linkPath) => ipcRenderer.invoke('symlink:create', target, linkPath),
  checkSymlink: (targetPath) => ipcRenderer.invoke('symlink:check', targetPath),
  // 目录操作
  ensureDir: (dirPath) => ipcRenderer.invoke('dir:ensure', dirPath),
  moveDir: (sourcePath, targetPath) => ipcRenderer.invoke('dir:move', sourcePath, targetPath),
});

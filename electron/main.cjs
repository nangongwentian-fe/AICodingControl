const { app, BrowserWindow } = require('electron');

const isDev = !app.isPackaged;

// 延迟加载模块，因为这些模块内部引用了 electron API
let initConfig, setupIpcHandlers, createWindow;

app.whenReady().then(() => {
  // 在 app ready 后动态加载模块
  ({ initConfig } = require('./config/tools.cjs'));
  ({ setupIpcHandlers } = require('./ipc/index.cjs'));
  ({ createWindow } = require('./window.cjs'));

  initConfig();
  setupIpcHandlers();
  createWindow(isDev);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(isDev);
  }
});

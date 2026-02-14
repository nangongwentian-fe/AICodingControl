const { ipcMain, shell } = require('electron');

function setupShellIpcHandlers() {
  // 打开外部链接
  ipcMain.handle('shell:openExternal', async (event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 在系统文件资源管理器中打开路径
  ipcMain.handle('shell:openPath', async (event, targetPath) => {
    try {
      await shell.openPath(targetPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupShellIpcHandlers };

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function setupDirIpcHandlers() {
  // 读取目录（仅返回子目录名称）
  ipcMain.handle('dir:read', async (event, dirPath) => {
    try {
      if (!fs.existsSync(dirPath)) {
        return { success: true, exists: false, entries: [] };
      }
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const directories = entries
        .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
        .map((entry) => entry.name);
      return { success: true, exists: true, entries: directories };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 读取目录（仅返回文件名称）
  ipcMain.handle('dir:readFiles', async (event, dirPath) => {
    try {
      if (!fs.existsSync(dirPath)) {
        return { success: true, exists: false, entries: [] };
      }
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const files = entries
        .filter((entry) => entry.isFile() || entry.isSymbolicLink())
        .map((entry) => entry.name);
      return { success: true, exists: true, entries: files };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 判断路径是否存在
  ipcMain.handle('path:exists', async (event, targetPath) => {
    try {
      return { success: true, exists: fs.existsSync(targetPath) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 复制目录
  ipcMain.handle('dir:copy', async (event, sourcePath, targetPath) => {
    try {
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: '源目录不存在' };
      }
      const targetParent = path.dirname(targetPath);
      if (!fs.existsSync(targetParent)) {
        fs.mkdirSync(targetParent, { recursive: true });
      }
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      }
      fs.cpSync(sourcePath, targetPath, { recursive: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 删除目录
  ipcMain.handle('dir:remove', async (event, targetPath) => {
    try {
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 确保目录存在
  ipcMain.handle('dir:ensure', async (event, dirPath) => {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 移动目录
  ipcMain.handle('dir:move', async (event, sourcePath, targetPath) => {
    try {
      const targetParent = path.dirname(targetPath);
      if (!fs.existsSync(targetParent)) {
        fs.mkdirSync(targetParent, { recursive: true });
      }
      fs.renameSync(sourcePath, targetPath);
      return { success: true };
    } catch (error) {
      // renameSync 跨设备可能失败，回退到 copy + remove
      try {
        fs.cpSync(sourcePath, targetPath, { recursive: true });
        fs.rmSync(sourcePath, { recursive: true, force: true });
        return { success: true };
      } catch (fallbackError) {
        return { success: false, error: fallbackError.message };
      }
    }
  });
}

module.exports = { setupDirIpcHandlers };

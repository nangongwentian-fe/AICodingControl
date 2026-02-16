const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function setupFileIpcHandlers() {
  // 文件读取 IPC
  ipcMain.handle('file:read', async (event, filePath) => {
    try {
      // 确保目录存在
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // 如果文件不存在，创建空文件
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '', 'utf-8');
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 文件写入 IPC
  ipcMain.handle('file:write', async (event, filePath, content) => {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 文件复制 IPC
  ipcMain.handle('file:copy', async (event, sourcePath, targetPath) => {
    try {
      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: '源文件不存在' };
      }
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      }
      fs.copyFileSync(sourcePath, targetPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 文件删除 IPC
  ipcMain.handle('file:remove', async (event, targetPath) => {
    try {
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupFileIpcHandlers };

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
}

module.exports = { setupFileIpcHandlers };

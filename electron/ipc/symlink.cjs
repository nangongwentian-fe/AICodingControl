const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function setupSymlinkIpcHandlers() {
  // 创建软链接
  ipcMain.handle('symlink:create', async (event, target, linkPath, type) => {
    try {
      const linkParent = path.dirname(linkPath);
      if (!fs.existsSync(linkParent)) {
        fs.mkdirSync(linkParent, { recursive: true });
      }
      if (fs.existsSync(linkPath)) {
        fs.rmSync(linkPath, { recursive: true, force: true });
      }
      fs.symlinkSync(target, linkPath, type || 'dir');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 检查是否为软链接
  ipcMain.handle('symlink:check', async (event, targetPath) => {
    try {
      if (!fs.existsSync(targetPath)) {
        return { success: true, isSymlink: false };
      }
      const stats = fs.lstatSync(targetPath);
      return { success: true, isSymlink: stats.isSymbolicLink() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupSymlinkIpcHandlers };

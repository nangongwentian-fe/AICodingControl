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

  // 检查是否为软链接（包括失效的软链接）
  ipcMain.handle('symlink:check', async (event, targetPath) => {
    try {
      // 使用 lstat 而不是 exists，因为 exists 会跟随软链接
      // 对于失效的软链接（目标不存在），exists 返回 false，无法检测到软链接本身
      const stats = fs.lstatSync(targetPath);
      return { success: true, isSymlink: stats.isSymbolicLink() };
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 文件不存在（包括软链接本身不存在的情况）
        return { success: true, isSymlink: false };
      }
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupSymlinkIpcHandlers };

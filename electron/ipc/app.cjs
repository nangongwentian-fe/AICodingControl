const { ipcMain } = require('electron');
const os = require('os');
const fs = require('fs');
const { getAppDataDir, getAiToolsFile } = require('../utils/path.cjs');
const { normalizeAiToolsConfig } = require('../config/tools.cjs');

function setupAppIpcHandlers() {
  // 获取应用数据目录路径
  ipcMain.handle('app:getDataDir', () => {
    return getAppDataDir();
  });

  // 获取用户 home 目录路径
  ipcMain.handle('app:getHomeDir', () => {
    return os.homedir();
  });

  // 获取 AI 工具配置
  ipcMain.handle('app:getAiTools', async () => {
    try {
      const AI_TOOLS_FILE = getAiToolsFile();
      const content = fs.readFileSync(AI_TOOLS_FILE, 'utf-8');
      const { config, changed } = normalizeAiToolsConfig(JSON.parse(content));
      if (changed) {
        fs.writeFileSync(AI_TOOLS_FILE, JSON.stringify(config, null, 2), 'utf-8');
      }
      return { success: true, data: config };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 保存 AI 工具配置
  ipcMain.handle('app:saveAiTools', async (event, config) => {
    try {
      const AI_TOOLS_FILE = getAiToolsFile();
      fs.writeFileSync(AI_TOOLS_FILE, JSON.stringify(config, null, 2), 'utf-8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupAppIpcHandlers };

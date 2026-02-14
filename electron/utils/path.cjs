const path = require('path');
const os = require('os');
const { app } = require('electron');

const APP_NAME = 'AI Coding Control';

// 应用数据目录 - 延迟初始化，因为 app.getPath 需要在 app ready 后调用
let _APP_DATA_DIR;
let _AI_TOOLS_FILE;
let _APPDATA_DIR;

function initPaths() {
  if (!_APP_DATA_DIR) {
    app.setName(APP_NAME);
    _APPDATA_DIR = app.getPath('appData');
    _APP_DATA_DIR = path.join(os.homedir(), '.ai-coding-control');
    _AI_TOOLS_FILE = path.join(_APP_DATA_DIR, 'ai_coding_tools.json');
  }
}

function getTraeMcpConfigPath(folderName) {
  initPaths();
  return path.join(_APPDATA_DIR, folderName, 'User', 'mcp.json');
}

function getAppDataDir() {
  initPaths();
  return _APP_DATA_DIR;
}

function getAiToolsFile() {
  initPaths();
  return _AI_TOOLS_FILE;
}

function getAppDataPath() {
  initPaths();
  return _APPDATA_DIR;
}

module.exports = {
  APP_NAME,
  getTraeMcpConfigPath,
  getAppDataDir,
  getAiToolsFile,
  getAppDataPath,
};

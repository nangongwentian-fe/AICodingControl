const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const APP_NAME = 'AI Coding Control';

app.setName(APP_NAME);

// 应用数据目录
const APP_DATA_DIR = path.join(os.homedir(), '.ai-coding-control');
const AI_TOOLS_FILE = path.join(APP_DATA_DIR, 'ai_coding_tools.json');

// 默认的 AI 工具配置
const DEFAULT_AI_TOOLS = {
  tools: [
    {
      id: 'trae',
      name: 'Trae',
      ruleTargetPath: '~/.trae/user_rules.md',
      commandsPath: '~/.trae/commands',
      skillsPath: '~/.trae/skills',
      mcpConfigPath: '~/.trae/mcp.json',
      mcpConfigKey: 'mcpServers',
      mcpFormat: 'json',
    },
    {
      id: 'traecn',
      name: 'TraeCN',
      ruleTargetPath: '~/.trae-cn/user_rules.md',
      commandsPath: '~/.trae-cn/commands',
      skillsPath: '~/.trae-cn/skills',
      mcpConfigPath: '~/.trae-cn/mcp.json',
      mcpConfigKey: 'mcpServers',
      mcpFormat: 'json',
    },
    {
      id: 'cursor',
      name: 'Cursor',
      ruleTargetPath: null,
      commandsPath: '~/.cursor/commands',
      skillsPath: '~/.cursor/skills',
      mcpConfigPath: '~/.cursor/mcp.json',
      mcpConfigKey: 'mcpServers',
      mcpFormat: 'json',
    },
    {
      id: 'opencode',
      name: 'Open Code',
      ruleTargetPath: '~/.opencode/AGENTS.md',
      commandsPath: '~/.config/opencode/commands',
      skillsPath: '~/.config/opencode/skill',
      mcpConfigPath: '~/.opencode/config.json',
      mcpConfigKey: 'mcp',
      mcpFormat: 'json',
    },
    {
      id: 'codex',
      name: 'Codex',
      ruleTargetPath: '~/.codex/AGENTS.md',
      commandsPath: '~/.codex/prompts',
      skillsPath: '~/.codex/skills',
      mcpConfigPath: '~/.codex/config.toml',
      mcpConfigKey: 'mcp_servers',
      mcpFormat: 'toml',
    },
    {
      id: 'claudecode',
      name: 'Claude Code',
      ruleTargetPath: '~/.claude/CLAUDE.md',
      commandsPath: '~/.claude/commands',
      skillsPath: '~/.claude/skills',
      mcpConfigPath: '~/.claude.json',
      mcpConfigKey: 'mcpServers',
      mcpFormat: 'json',
    },
    {
      id: 'antigravity',
      name: 'Antigravity',
      ruleTargetPath: '~/.gemini/GEMINI.md',
      commandsPath: '~/.gemini/antigravity/global_workflows',
      skillsPath: '~/.gemini/antigravity/skills',
      mcpConfigPath: '~/.gemini/antigravity/mcp_config.json',
      mcpConfigKey: 'mcpServers',
      mcpFormat: 'json',
    },
  ],
};

const DEFAULT_AI_TOOLS_BY_ID = DEFAULT_AI_TOOLS.tools.reduce((acc, tool) => {
  acc[tool.id] = tool;
  return acc;
}, {});

const AI_TOOL_OPTIONAL_KEYS = [
  'ruleTargetPath',
  'commandsPath',
  'skillsPath',
  'mcpConfigPath',
  'mcpConfigKey',
  'mcpFormat',
];

function normalizeAiToolsConfig(rawConfig) {
  if (!rawConfig || !Array.isArray(rawConfig.tools)) {
    return { config: DEFAULT_AI_TOOLS, changed: true };
  }

  let changed = false;
  const normalizedTools = rawConfig.tools.map((tool) => {
    const defaultTool = DEFAULT_AI_TOOLS_BY_ID[tool.id];
    const nextTool = { ...tool };
    for (const key of AI_TOOL_OPTIONAL_KEYS) {
      if (Object.prototype.hasOwnProperty.call(nextTool, key)) continue;
      nextTool[key] = defaultTool ? defaultTool[key] ?? null : null;
      changed = true;
    }
    return nextTool;
  });

  return { config: { ...rawConfig, tools: normalizedTools }, changed };
}

// 初始化 AI 工具配置文件
function initAiToolsConfig() {
  // 确保目录存在
  if (!fs.existsSync(APP_DATA_DIR)) {
    fs.mkdirSync(APP_DATA_DIR, { recursive: true });
  }

  // 如果配置文件不存在，创建默认配置
  if (!fs.existsSync(AI_TOOLS_FILE)) {
    fs.writeFileSync(AI_TOOLS_FILE, JSON.stringify(DEFAULT_AI_TOOLS, null, 2), 'utf-8');
    return;
  }

  try {
    const content = fs.readFileSync(AI_TOOLS_FILE, 'utf-8');
    const { config, changed } = normalizeAiToolsConfig(JSON.parse(content));
    if (changed) {
      fs.writeFileSync(AI_TOOLS_FILE, JSON.stringify(config, null, 2), 'utf-8');
    }
  } catch (error) {
    fs.writeFileSync(AI_TOOLS_FILE, JSON.stringify(DEFAULT_AI_TOOLS, null, 2), 'utf-8');
  }
}

const isDev = !app.isPackaged;

// 注册 IPC 处理程序（在应用启动时注册，而不是在窗口创建时）
function setupIpcHandlers() {
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

  // 获取应用数据目录路径
  ipcMain.handle('app:getDataDir', () => {
    return APP_DATA_DIR;
  });

  // 获取用户 home 目录路径
  ipcMain.handle('app:getHomeDir', () => {
    return os.homedir();
  });

  // 获取 AI 工具配置
  ipcMain.handle('app:getAiTools', async () => {
    try {
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
  ipcMain.handle('app:saveAiTools', async (_, config) => {
    try {
      fs.writeFileSync(AI_TOOLS_FILE, JSON.stringify(config, null, 2), 'utf-8');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 打开外部链接
  ipcMain.handle('shell:openExternal', async (_, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    transparent: true,
    title: APP_NAME,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow.destroy();
  });

  // 窗口控制IPC监听
  ipcMain.on('window:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow.close();
  });
}

app.whenReady().then(() => {
  initAiToolsConfig();
  setupIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

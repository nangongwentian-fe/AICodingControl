const fs = require('fs');
const { getTraeMcpConfigPath, getAppDataDir, getAiToolsFile } = require('../utils/path.cjs');

// 默认的 AI 工具配置 - 延迟生成，因为需要调用 getTraeMcpConfigPath
function getDefaultAiTools() {
  return {
    tools: [
      {
        id: 'trae',
        name: 'Trae',
        ruleTargetPath: '~/.trae/user_rules.md',
        commandsPath: '~/.trae/commands',
        skillsPath: '~/.trae/skills',
        mcpConfigPath: getTraeMcpConfigPath('Trae'),
        mcpConfigKey: 'mcpServers',
        mcpFormat: 'json',
      },
      {
        id: 'traecn',
        name: 'TraeCN',
        ruleTargetPath: '~/.trae-cn/user_rules.md',
        commandsPath: '~/.trae-cn/commands',
        skillsPath: '~/.trae-cn/skills',
        mcpConfigPath: getTraeMcpConfigPath('Trae CN'),
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
}

const AI_TOOL_OPTIONAL_KEYS = [
  'ruleTargetPath',
  'commandsPath',
  'skillsPath',
  'mcpConfigPath',
  'mcpConfigKey',
  'mcpFormat',
];

function normalizeAiToolsConfig(rawConfig) {
  const DEFAULT_AI_TOOLS = getDefaultAiTools();
  const DEFAULT_AI_TOOLS_BY_ID = DEFAULT_AI_TOOLS.tools.reduce((acc, tool) => {
    acc[tool.id] = tool;
    return acc;
  }, {});

  if (!rawConfig || !Array.isArray(rawConfig.tools)) {
    return { config: DEFAULT_AI_TOOLS, changed: true };
  }

  let changed = false;
  const existingToolIds = new Set();

  // 规范化已有工具，填充缺失的字段
  const normalizedTools = rawConfig.tools.map((tool) => {
    const defaultTool = DEFAULT_AI_TOOLS_BY_ID[tool.id];
    const nextTool = { ...tool };
    existingToolIds.add(tool.id);

    for (const key of AI_TOOL_OPTIONAL_KEYS) {
      if (Object.prototype.hasOwnProperty.call(nextTool, key)) continue;
      nextTool[key] = defaultTool ? defaultTool[key] ?? null : null;
      changed = true;
    }
    return nextTool;
  });

  // 添加 DEFAULT_AI_TOOLS 中新增的工具
  for (const defaultTool of DEFAULT_AI_TOOLS.tools) {
    if (!existingToolIds.has(defaultTool.id)) {
      normalizedTools.push({ ...defaultTool });
      changed = true;
    }
  }

  return { config: { ...rawConfig, tools: normalizedTools }, changed };
}

// 初始化 AI 工具配置文件
function initConfig() {
  const APP_DATA_DIR = getAppDataDir();
  const AI_TOOLS_FILE = getAiToolsFile();
  const DEFAULT_AI_TOOLS = getDefaultAiTools();

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

module.exports = {
  AI_TOOL_OPTIONAL_KEYS,
  normalizeAiToolsConfig,
  initConfig,
  getDefaultAiTools,
};

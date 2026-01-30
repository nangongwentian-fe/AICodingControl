import type {
  AiTool,
  ClaudeCodeHttpConfig,
  ClaudeCodeServerConfig,
  CodexServerConfig,
  CodexStdioConfig,
  McpHttpConfig,
  McpServer,
  McpServerConfig,
  McpStdioConfig,
  OpenCodeLocalConfig,
  OpenCodeServerConfig,
  TraeCursorServerConfig,
  TraeCursorStdioConfig,
} from './types';

// ============ 类型守卫 ============

/**
 * 验证配置是否为有效的 MCP 配置对象
 */
export function isValidMcpConfigRecord(config: unknown): config is Record<string, unknown> {
  return typeof config === 'object' && config !== null && !Array.isArray(config);
}

export function isStdioConfig(config: McpServerConfig): config is McpStdioConfig {
  return config.type === 'stdio';
}

export function isHttpConfig(config: McpServerConfig): config is McpHttpConfig {
  return config.type === 'http';
}

export function isTraeCursorStdio(config: TraeCursorServerConfig): config is TraeCursorStdioConfig {
  return 'command' in config;
}

export function isOpenCodeLocal(config: OpenCodeServerConfig): config is OpenCodeLocalConfig {
  return config.type === 'local';
}

export function isCodexStdio(config: CodexServerConfig): config is CodexStdioConfig {
  return 'command' in config;
}

export function isClaudeCodeHttp(config: ClaudeCodeServerConfig): config is ClaudeCodeHttpConfig {
  return 'type' in config && config.type === 'http';
}

// ============ 内部格式 -> Trae/Cursor 格式 ============

export function toTraeCursorConfig(config: McpServerConfig): TraeCursorServerConfig {
  if (isStdioConfig(config)) {
    return {
      command: config.command,
      args: config.args,
      env: config.env,
    };
  }
  // HTTP 类型
  return {
    url: config.url,
    headers: config.headers,
  };
}

// ============ Trae/Cursor 格式 -> 内部格式 ============

export function fromTraeCursorConfig(config: TraeCursorServerConfig): McpServerConfig {
  if (isTraeCursorStdio(config)) {
    return {
      type: 'stdio',
      command: config.command,
      args: config.args ?? [],
      env: config.env,
    };
  }
  // HTTP 类型
  return {
    type: 'http',
    url: config.url,
    headers: config.headers,
  };
}

// ============ 内部格式 -> Open Code 格式 ============

export function toOpenCodeConfig(config: McpServerConfig): OpenCodeServerConfig {
  if (isStdioConfig(config)) {
    return {
      type: 'local',
      command: [config.command, ...config.args],
      environment: config.env,
    };
  }
  // HTTP 类型
  return {
    type: 'remote',
    url: config.url,
    headers: config.headers,
  };
}

// ============ Open Code 格式 -> 内部格式 ============

export function fromOpenCodeConfig(config: OpenCodeServerConfig): McpServerConfig {
  if (isOpenCodeLocal(config)) {
    const [command, ...args] = config.command;
    return {
      type: 'stdio',
      command,
      args,
      env: config.environment,
    };
  }
  // remote 类型
  return {
    type: 'http',
    url: config.url,
    headers: config.headers,
  };
}

// ============ 内部格式 -> Codex 格式 ============

export function toCodexConfig(config: McpServerConfig): CodexServerConfig {
  if (isStdioConfig(config)) {
    return {
      command: config.command,
      args: config.args,
      env: config.env,
    };
  }
  // HTTP 类型
  return {
    url: config.url,
    http_headers: config.headers,
  };
}

// ============ Codex 格式 -> 内部格式 ============

export function fromCodexConfig(config: CodexServerConfig): McpServerConfig {
  if (isCodexStdio(config)) {
    return {
      type: 'stdio',
      command: config.command,
      args: config.args ?? [],
      env: config.env,
    };
  }
  // HTTP 类型
  return {
    type: 'http',
    url: config.url,
    headers: config.http_headers,
  };
}

// ============ 内部格式 -> Claude Code 格式 ============

export function toClaudeCodeConfig(config: McpServerConfig): ClaudeCodeServerConfig {
  if (isStdioConfig(config)) {
    return {
      command: config.command,
      args: config.args,
      env: config.env,
    };
  }
  // HTTP 类型
  return {
    type: 'http',
    url: config.url,
    headers: config.headers,
  };
}

// ============ Claude Code 格式 -> 内部格式 ============

export function fromClaudeCodeConfig(config: ClaudeCodeServerConfig): McpServerConfig {
  if (isClaudeCodeHttp(config)) {
    return {
      type: 'http',
      url: config.url,
      headers: config.headers,
    };
  }
  // stdio 类型
  return {
    type: 'stdio',
    command: config.command,
    args: config.args ?? [],
    env: config.env,
  };
}

// ============ 统一的转换接口 ============

type ToolConfigMap = {
  trae: TraeCursorServerConfig;
  traecn: TraeCursorServerConfig;
  cursor: TraeCursorServerConfig;
  opencode: OpenCodeServerConfig;
  codex: CodexServerConfig;
  claudecode: ClaudeCodeServerConfig;
  antigravity: TraeCursorServerConfig;
};

/**
 * 将内部格式转换为指定工具的格式
 */
export function toToolConfig<T extends AiTool>(
  config: McpServerConfig,
  tool: T,
): ToolConfigMap[T] {
  switch (tool) {
    case 'trae':
    case 'traecn':
    case 'cursor':
    case 'antigravity':
      return toTraeCursorConfig(config) as ToolConfigMap[T];
    case 'opencode':
      return toOpenCodeConfig(config) as ToolConfigMap[T];
    case 'codex':
      return toCodexConfig(config) as ToolConfigMap[T];
    case 'claudecode':
      return toClaudeCodeConfig(config) as ToolConfigMap[T];
    default:
      throw new Error(`不支持的工具类型: ${tool}`);
  }
}

/**
 * 将指定工具的格式转换为内部格式
 */
export function fromToolConfig<T extends AiTool>(
  config: ToolConfigMap[T],
  tool: T,
): McpServerConfig {
  switch (tool) {
    case 'trae':
    case 'traecn':
    case 'cursor':
    case 'antigravity':
      return fromTraeCursorConfig(config as TraeCursorServerConfig);
    case 'opencode':
      return fromOpenCodeConfig(config as OpenCodeServerConfig);
    case 'codex':
      return fromCodexConfig(config as CodexServerConfig);
    case 'claudecode':
      return fromClaudeCodeConfig(config as ClaudeCodeServerConfig);
    default:
      throw new Error(`不支持的工具类型: ${tool}`);
  }
}

// ============ 批量转换 ============

/**
 * 将 McpServer 列表导出为指定工具的配置格式
 */
export function exportToToolFormat<T extends AiTool>(
  servers: McpServer[],
  tool: T,
): Record<string, ToolConfigMap[T]> {
  const result: Record<string, ToolConfigMap[T]> = {};
  for (const server of servers) {
    result[server.name] = toToolConfig(server.config, tool);
  }
  return result;
}

/**
 * 从指定工具的配置格式导入为 McpServer 列表
 */
export function importFromToolFormat<T extends AiTool>(
  config: Record<string, ToolConfigMap[T]>,
  tool: T,
): McpServer[] {
  return Object.entries(config).map(([name, serverConfig]) => ({
    name,
    config: fromToolConfig(serverConfig, tool),
  }));
}

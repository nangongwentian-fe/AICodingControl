// ============ 统一的内部格式 ============

// stdio 类型配置
export interface McpStdioConfig {
  type: 'stdio';
  command: string;
  args: string[];
  env?: Record<string, string>;
}

// HTTP 类型配置
export interface McpHttpConfig {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
}

// 统一的服务器配置（支持 stdio 和 http 两种类型）
export type McpServerConfig = McpStdioConfig | McpHttpConfig;

export interface McpServer {
  name: string;
  config: McpServerConfig;
}

// ============ Trae / Cursor 格式 ============
// 文档: https://docs.trae.ai/ide/add-mcp-servers

export interface TraeCursorStdioConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface TraeCursorHttpConfig {
  url: string;
  headers?: Record<string, string>;
}

export type TraeCursorServerConfig = TraeCursorStdioConfig | TraeCursorHttpConfig;

export type TraeCursorMcpConfig = Record<string, TraeCursorServerConfig>;

// ============ Open Code 格式 ============
// 文档: https://opencode.ai/docs/mcp-servers/

export interface OpenCodeLocalConfig {
  type: 'local';
  command: string[]; // 命令和参数合并为数组
  environment?: Record<string, string>;
  enabled?: boolean;
  timeout?: number;
}

export interface OpenCodeRemoteConfig {
  type: 'remote';
  url: string;
  headers?: Record<string, string>;
  enabled?: boolean;
  timeout?: number;
}

export type OpenCodeServerConfig = OpenCodeLocalConfig | OpenCodeRemoteConfig;

export type OpenCodeMcpConfig = Record<string, OpenCodeServerConfig>;

// ============ Codex 格式 ============
// 文档: https://developers.openai.com/codex/mcp/
// 配置文件: ~/.codex/config.toml (TOML 格式)

export interface CodexStdioConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  env_vars?: string[]; // 允许转发的环境变量
  cwd?: string;
  startup_timeout_sec?: number;
  tool_timeout_sec?: number;
  enabled?: boolean;
  enabled_tools?: string[];
  disabled_tools?: string[];
}

export interface CodexHttpConfig {
  url: string;
  bearer_token_env_var?: string;
  http_headers?: Record<string, string>;
  env_http_headers?: Record<string, string>; // header name -> env var name
  startup_timeout_sec?: number;
  tool_timeout_sec?: number;
  enabled?: boolean;
  enabled_tools?: string[];
  disabled_tools?: string[];
}

export type CodexServerConfig = CodexStdioConfig | CodexHttpConfig;

export type CodexMcpConfig = Record<string, CodexServerConfig>;

// ============ Claude Code 格式 ============
// 文档: https://code.claude.com/docs/en/mcp
// 配置文件: ~/.claude.json 或 .mcp.json

export interface ClaudeCodeStdioConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface ClaudeCodeHttpConfig {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
}

export type ClaudeCodeServerConfig = ClaudeCodeStdioConfig | ClaudeCodeHttpConfig;

export type ClaudeCodeMcpConfig = Record<string, ClaudeCodeServerConfig>;

// ============ 支持的工具类型 ============

export type AiTool = 'trae' | 'traecn' | 'cursor' | 'opencode' | 'codex' | 'claudecode' | 'antigravity';

// ============ MCP 与工具的关联状态 ============

// 记录每个 MCP 在各工具中的配置状态
export type McpToolStatus = Record<AiTool, boolean>;

// 带有工具配置状态的 MCP
export interface McpServerWithStatus extends McpServer {
  toolStatus: McpToolStatus;
}

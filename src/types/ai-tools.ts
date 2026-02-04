export type McpFormat = 'json' | 'toml';

/**
 * 统一的 AI 工具配置
 */
export interface AiToolConfig {
  /** 工具唯一标识 */
  id: string;
  /** 工具显示名称 */
  name: string;
  /** Rule 文件路径，null 表示不支持 Rule 同步 */
  ruleTargetPath: string | null;
  /** Commands 目录路径，null 表示不支持 Commands 同步 */
  commandsPath: string | null;
  /** Skills 目录路径，null 表示不支持 Skills 同步 */
  skillsPath: string | null;
  /** MCP 配置文件路径，null 表示不支持 MCP 同步 */
  mcpConfigPath: string | null;
  /** MCP 配置的 key */
  mcpConfigKey: string | null;
  /** MCP 配置格式 */
  mcpFormat: McpFormat | null;
}

/**
 * ai_coding_tools.json 文件结构
 */
export interface AiToolsConfig {
  tools: AiToolConfig[];
}

/**
 * 工具 ID 类型
 */
export type AiToolId =
  | 'trae'
  | 'traecn'
  | 'cursor'
  | 'opencode'
  | 'codex'
  | 'claudecode'
  | 'antigravity';

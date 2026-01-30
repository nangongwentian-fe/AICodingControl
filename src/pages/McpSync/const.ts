import type { AiTool } from './types';
import claudeCodeLogo from '@/assets/images/claude_code.svg';
import codexLogo from '@/assets/images/codex.svg';
import cursorLogo from '@/assets/images/cursor.jpeg';
import opencodeLogo from '@/assets/images/opencode.png';
import traeLogo from '@/assets/images/trae.png';

export const COMMAND_OPTIONS = [
  { label: 'npx', value: 'npx' },
  { label: 'uvx', value: 'uvx' },
  { label: 'node', value: 'node' },
];

export type ConfigFormat = 'json' | 'toml';

export interface McpToolConfig {
  key: AiTool;
  name: string;
  logo?: string;
  configPath: string;
  configKey: string;
  format: ConfigFormat;
}

export const MCP_TOOLS: McpToolConfig[] = [
  {
    key: 'trae',
    name: 'Trae',
    logo: traeLogo,
    configPath: '~/.trae/mcp.json',
    configKey: 'mcpServers',
    format: 'json',
  },
  {
    key: 'traecn',
    name: 'TraeCN',
    logo: traeLogo,
    configPath: '~/.trae-cn/mcp.json',
    configKey: 'mcpServers',
    format: 'json',
  },
  {
    key: 'cursor',
    name: 'Cursor',
    logo: cursorLogo,
    configPath: '~/.cursor/mcp.json',
    configKey: 'mcpServers',
    format: 'json',
  },
  {
    key: 'opencode',
    name: 'Open Code',
    logo: opencodeLogo,
    configPath: '~/.opencode/config.json',
    configKey: 'mcp',
    format: 'json',
  },
  {
    key: 'codex',
    name: 'Codex',
    logo: codexLogo,
    configPath: '~/.codex/config.toml',
    configKey: 'mcp_servers',
    format: 'toml',
  },
  {
    key: 'claudecode',
    name: 'Claude Code',
    logo: claudeCodeLogo,
    configPath: '~/.claude.json',
    configKey: 'mcpServers',
    format: 'json',
  },
];

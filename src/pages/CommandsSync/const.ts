import type { AiToolId } from '@/types/ai-tools';

export const COMMAND_FILE_EXTENSION = '.md';

export const COMMAND_TOOL_PATHS: Record<AiToolId, string> = {
  claudecode: '~/.claude/commands',
  codex: '~/.codex/prompts',
  opencode: '~/.config/opencode/commands',
  antigravity: '~/.gemini/antigravity/global_workflows',
  cursor: '~/.cursor/commands',
  trae: '~/.trae/commands',
  traecn: '~/.trae-cn/commands',
};

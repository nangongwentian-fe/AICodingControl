import type { AiToolId } from '@/types/ai-tools';

export const SKILL_DEFINITION_FILE = 'SKILL.md';

export const SKILL_TOOL_PATHS: Record<AiToolId, string> = {
  claudecode: '~/.claude/skills',
  codex: '~/.codex/skills',
  opencode: '~/.config/opencode/skill',
  antigravity: '~/.gemini/antigravity/skills',
  cursor: '~/.cursor/skills',
  trae: '~/.trae/skills',
  traecn: '~/.trae-cn/skills',
};

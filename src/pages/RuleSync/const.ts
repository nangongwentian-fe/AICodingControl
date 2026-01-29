import type { AITool } from './types';
import antigravityLogo from '@/assets/images/antigravity.png';
import claudeCodeLogo from '@/assets/images/claude_code.svg';
import codexLogo from '@/assets/images/codex.svg';
import traeLogo from '@/assets/images/trae.png';

export const AI_TOOLS: AITool[] = [
  { key: 'claude-code', name: 'Claude Code', logo: claudeCodeLogo, targetPath: '~/.claude/CLAUDE.md' },
  { key: 'codex', name: 'Codex', logo: codexLogo, targetPath: '~/.codex/AGENTS.md' },
  { key: 'antigravity', name: 'Antigravity', logo: antigravityLogo, targetPath: '~/.gemini/GEMINI.md' },
  { key: 'trae', name: 'Trae', logo: traeLogo, targetPath: '~/.trae/user_rules.md' },
  { key: 'trae-cn', name: 'TraeCN', logo: traeLogo, targetPath: '~/.trae-cn/user_rules.md' },
];

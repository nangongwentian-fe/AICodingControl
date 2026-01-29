import antigravityLogo from '@/assets/images/antigravity.png';
import claudeCodeLogo from '@/assets/images/claude_code.svg';
import codexLogo from '@/assets/images/codex.svg';
import traeLogo from '@/assets/images/trae.png';

export const AI_TOOLS = [
  { key: 'claude-code', name: 'Claude Code', logo: claudeCodeLogo },
  { key: 'codex', name: 'Codex', logo: codexLogo },
  { key: 'antigravity', name: 'Antigravity', logo: antigravityLogo },
  { key: 'trae', name: 'Trae', logo: traeLogo },
] as const;

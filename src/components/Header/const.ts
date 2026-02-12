import type { PageMenuOption, PageMenuValue } from './types';
import claudeCodeIcon from '@/assets/images/claude_code.svg';

// 图标组件在 PageMenu.tsx 中导入使用
export const PAGE_MENU_OPTIONS: PageMenuOption[] = [
  { label: 'Rule同步', value: 'rule-sync', icon: 'FileTextOutlined' },
  { label: 'MCP同步', value: 'mcp-sync', icon: 'iconify:mingcute:mcp-line' },
  { label: 'Skills同步', value: 'skills-sync', icon: 'RocketOutlined' },
  { label: 'Commands同步', value: 'commands-sync', icon: 'iconify:ri:slash-commands-2' },
  { label: 'Claude Code', value: 'claude-code', icon: claudeCodeIcon },
];

export const DEFAULT_PAGE: PageMenuValue = 'rule-sync';

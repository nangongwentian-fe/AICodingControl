import type { PageMenuOption, PageMenuValue } from './types';
import claudeCodeIcon from '@/assets/images/claude_code.svg';

// 图标组件在 PageMenu.tsx 中导入使用
export const PAGE_MENU_OPTIONS: PageMenuOption[] = [
  { labelKey: 'pageMenu.ruleSync', value: 'rule-sync', icon: { type: 'antd', name: 'FileTextOutlined' } },
  { labelKey: 'pageMenu.mcpSync', value: 'mcp-sync', icon: { type: 'iconify', name: 'mingcute:mcp-line' } },
  { labelKey: 'pageMenu.skillsSync', value: 'skills-sync', icon: { type: 'antd', name: 'RocketOutlined' } },
  { labelKey: 'pageMenu.commandsSync', value: 'commands-sync', icon: { type: 'iconify', name: 'ri:slash-commands-2' } },
  { labelKey: 'pageMenu.claudeCode', value: 'claude-code', icon: { type: 'image', src: claudeCodeIcon } },
];

export const DEFAULT_PAGE: PageMenuValue = 'rule-sync';

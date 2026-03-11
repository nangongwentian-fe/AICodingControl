import type { PageMenuIcon } from './types';
import claudeCodeIcon from '@/assets/images/claude_code.svg';

export interface NavItem {
  labelKey: string;
  value: string;
  icon?: PageMenuIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: 'pageMenu.ruleSync', value: 'rule-sync', icon: { type: 'iconify', name: 'mdi:file-document-outline' } },
  { labelKey: 'pageMenu.mcpSync', value: 'mcp-sync', icon: { type: 'iconify', name: 'mingcute:mcp-line' } },
  { labelKey: 'pageMenu.skillsSync', value: 'skills-sync', icon: { type: 'iconify', name: 'mdi:rocket-launch-outline' } },
  { labelKey: 'pageMenu.commandsSync', value: 'commands-sync', icon: { type: 'iconify', name: 'ri:slash-commands-2' } },
  { labelKey: 'pageMenu.claudeCode', value: 'claude-code', icon: { type: 'image', src: claudeCodeIcon } },
];

export const DEFAULT_PAGE = 'rule-sync';

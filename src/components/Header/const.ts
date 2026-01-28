import type { PageMenuValue } from './types';

export const PAGE_MENU_OPTIONS: { label: string; value: PageMenuValue }[] = [
  { label: 'Rule同步', value: 'rule-sync' },
  { label: 'MCP同步', value: 'mcp-sync' },
  { label: 'Skills同步', value: 'skills-sync' },
];

export const DEFAULT_PAGE: PageMenuValue = 'rule-sync';

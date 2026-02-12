import type { ReactNode } from 'react';

export type PageMenuValue = 'rule-sync' | 'mcp-sync' | 'skills-sync' | 'commands-sync' | 'claude-code';

export interface PageMenuOption {
  label: string;
  value: PageMenuValue;
  icon?: ReactNode | string;
}

export type PageMenuValue = 'rule-sync' | 'mcp-sync' | 'skills-sync' | 'commands-sync' | 'claude-code';

export type AntdIconName = 'FileTextOutlined' | 'RocketOutlined';

export interface PageMenuIconAntd {
  type: 'antd';
  name: AntdIconName;
}

export interface PageMenuIconIconify {
  type: 'iconify';
  name: string;
}

export interface PageMenuIconImage {
  type: 'image';
  src: string;
  alt?: string;
}

export type PageMenuIcon = PageMenuIconAntd | PageMenuIconIconify | PageMenuIconImage;

export interface PageMenuOption {
  label: string;
  value: PageMenuValue;
  icon?: PageMenuIcon;
}

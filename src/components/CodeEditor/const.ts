import type { SupportedLanguage } from './types';

export const DEFAULT_EDITOR_OPTIONS = {
  automaticLayout: true,
  scrollBeyondLastLine: false,
  minimap: { enabled: false },
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on' as const,
};

export const FILE_EXTENSION_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  '.json': 'json',
  '.md': 'markdown',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.css': 'css',
  '.html': 'html',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
};

import type { EditorProps } from '@monaco-editor/react';

export type SupportedLanguage =
  | 'json'
  | 'markdown'
  | 'typescript'
  | 'javascript'
  | 'css'
  | 'html'
  | 'yaml'
  | 'xml';

export interface CodeEditorProps
  extends Omit<EditorProps, 'language' | 'theme'> {
  language?: SupportedLanguage;
  theme?: 'vs-dark' | 'vs-light' | 'hc-black';
}

import { memo } from 'react';
import Editor from '@monaco-editor/react';
import { DEFAULT_EDITOR_OPTIONS } from './const';
import type { CodeEditorProps } from './types';

const CodeEditor = memo<CodeEditorProps>(
  ({ language = 'json', theme = 'vs-dark', options, ...rest }) => {
    return (
      <Editor
        language={language}
        theme={theme}
        options={{ ...DEFAULT_EDITOR_OPTIONS, ...options }}
        {...rest}
      />
    );
  }
);

export default CodeEditor;

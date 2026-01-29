import type { CodeEditorProps } from './types';
import Editor from '@monaco-editor/react';
import { memo } from 'react';
import { DEFAULT_EDITOR_OPTIONS } from './const';

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
  },
);

export default CodeEditor;

import { memo, useState, useEffect } from 'react';
import CodeEditor from '@/components/CodeEditor';

const AGENTS_FILE = 'AGENTS.md';

const RuleSync = memo(() => {
  const [code, setCode] = useState('');
  const [filePath, setFilePath] = useState('');

  useEffect(() => {
    const loadAgentsFile = async () => {
      const dataDir = await window.electronAPI.getDataDir();
      const path = `${dataDir}/${AGENTS_FILE}`;
      setFilePath(path);
      const result = await window.electronAPI.readFile(path);
      if (result.success) {
        setCode(result.content ?? '');
      }
    };
    loadAgentsFile();
  }, []);

  const handleChange = async (value: string | undefined) => {
    const newValue = value ?? '';
    setCode(newValue);
    if (filePath) {
      await window.electronAPI.writeFile(filePath, newValue);
    }
  };

  return (
    <div className="h-full">
      <CodeEditor
        height="400px"
        language="markdown"
        value={code}
        onChange={handleChange}
      />
    </div>
  );
});

export default RuleSync;

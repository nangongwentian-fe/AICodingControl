import { Card } from 'antd';
import { memo, useEffect, useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import { AI_TOOLS } from './const';

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

  const handleChange = (value: string | undefined) => {
    const newValue = value ?? '';
    setCode(newValue);
    if (filePath) {
      void window.electronAPI.writeFile(filePath, newValue);
    }
  };

  return (
    <div className="h-full">
      <CodeEditor height="400px" language="markdown" value={code} onChange={handleChange} />
      <div className="mt-4 grid grid-cols-4 gap-4">
        {AI_TOOLS.map(tool => (
          <Card key={tool.key} title={tool.name} hoverable>
            {tool.name}
          </Card>
        ))}
      </div>
    </div>
  );
});

export default RuleSync;

import type { AITool } from './types';
import { Button, Card, message, Modal, Popconfirm, Space } from 'antd';
import { memo, useEffect, useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import { AI_TOOLS } from './const';

const AGENTS_FILE = 'AGENTS.md';

const RuleSync = memo(() => {
  const [code, setCode] = useState('');
  const [filePath, setFilePath] = useState('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingTool, setViewingTool] = useState<AITool | null>(null);
  const [viewingContent, setViewingContent] = useState('');

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
      window.electronAPI.writeFile(filePath, newValue);
    }
  };

  const handleSync = async (targetPath: string, toolName: string) => {
    const homeDir = await window.electronAPI.getHomeDir();
    const fullPath = targetPath.replace('~', homeDir);
    const result = await window.electronAPI.writeFile(fullPath, code);
    if (result.success) {
      message.success(`已同步到 ${toolName}`);
    }
    else {
      message.error(`同步失败: ${result.error}`);
    }
  };

  const handleView = async (tool: AITool) => {
    const homeDir = await window.electronAPI.getHomeDir();
    const fullPath = tool.targetPath.replace('~', homeDir);
    const result = await window.electronAPI.readFile(fullPath);
    setViewingTool(tool);
    setViewingContent(result.success ? (result.content ?? '') : '');
    setViewModalOpen(true);
  };

  const handleViewingContentChange = async (value: string | undefined) => {
    const newValue = value ?? '';
    setViewingContent(newValue);
    if (viewingTool) {
      const homeDir = await window.electronAPI.getHomeDir();
      const fullPath = viewingTool.targetPath.replace('~', homeDir);
      window.electronAPI.writeFile(fullPath, newValue);
    }
  };

  return (
    <div className="h-full">
      <CodeEditor height="400px" language="markdown" value={code} onChange={handleChange} />
      <div className="mt-4 grid grid-cols-4 gap-4">
        {AI_TOOLS.map(tool => (
          <Card
            key={tool.key}
            title={(
              <Space>
                <img src={tool.logo} alt={tool.name} className="h-6 w-6 object-contain" />
                <span>{tool.name}</span>
              </Space>
            )}
            hoverable
          >
            <Space>
              <Popconfirm
                title="确认同步"
                description={`确定要同步到 ${tool.name} 吗？`}
                onConfirm={() => void handleSync(tool.targetPath, tool.name)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="primary">同步</Button>
              </Popconfirm>
              <Button onClick={() => void handleView(tool)}>查看</Button>
            </Space>
          </Card>
        ))}
      </div>
      <Modal
        title={viewingTool ? `${viewingTool.name} Rule 文件` : '查看 Rule 文件'}
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        footer={null}
        width={800}
      >
        <CodeEditor height="400px" language="markdown" value={viewingContent} onChange={handleViewingContentChange} />
      </Modal>
    </div>
  );
});

export default RuleSync;

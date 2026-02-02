import type { AiToolWithLogo } from '@/hooks/useAiTools';
import { Button, Card, message, Modal, Popconfirm, Space, Spin } from 'antd';
import { memo, useEffect, useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import { useAiTools } from '@/hooks/useAiTools';

const AGENTS_FILE = 'AGENTS.md';

const RuleSync = memo(() => {
  const [code, setCode] = useState('');
  const [filePath, setFilePath] = useState('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingTool, setViewingTool] = useState<AiToolWithLogo | null>(null);
  const [viewingContent, setViewingContent] = useState('');

  const { ruleTools, loading: toolsLoading } = useAiTools();

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
    void loadAgentsFile();
  }, []);

  const handleChange = (value: string | undefined) => {
    const newValue = value ?? '';
    setCode(newValue);
    if (filePath) {
      void window.electronAPI.writeFile(filePath, newValue);
    }
  };

  const handleSync = async (tool: AiToolWithLogo) => {
    if (!tool.ruleTargetPath) return;
    const homeDir = await window.electronAPI.getHomeDir();
    const fullPath = tool.ruleTargetPath.replace('~', homeDir);
    const result = await window.electronAPI.writeFile(fullPath, code);
    if (result.success) {
      message.success(`已同步到 ${tool.name}`);
    }
    else {
      message.error(`同步失败: ${result.error}`);
    }
  };

  const handleView = async (tool: AiToolWithLogo) => {
    if (!tool.ruleTargetPath) return;
    const homeDir = await window.electronAPI.getHomeDir();
    const fullPath = tool.ruleTargetPath.replace('~', homeDir);
    const result = await window.electronAPI.readFile(fullPath);
    setViewingTool(tool);
    setViewingContent(result.success ? (result.content ?? '') : '');
    setViewModalOpen(true);
  };

  const handleViewingContentChange = async (value: string | undefined) => {
    const newValue = value ?? '';
    setViewingContent(newValue);
    if (viewingTool?.ruleTargetPath) {
      const homeDir = await window.electronAPI.getHomeDir();
      const fullPath = viewingTool.ruleTargetPath.replace('~', homeDir);
      void window.electronAPI.writeFile(fullPath, newValue);
    }
  };

  if (toolsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spin tip="加载中...">
          <div className="p-12" />
        </Spin>
      </div>
    );
  }

  return (
    <div>
      <CodeEditor height="400px" language="markdown" value={code} onChange={handleChange} />
      <div className="mt-4 grid grid-cols-4 gap-4">
        {ruleTools.map(tool => (
          <Card
            key={tool.id}
            title={(
              <Space>
                {tool.logoSrc && <img src={tool.logoSrc} alt={tool.name} className="h-6 w-6 object-contain" />}
                <span>{tool.name}</span>
              </Space>
            )}
            hoverable
          >
            <Space>
              <Popconfirm
                title="确认同步"
                description={`确定要同步到 ${tool.name} 吗？`}
                onConfirm={() => void handleSync(tool)}
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

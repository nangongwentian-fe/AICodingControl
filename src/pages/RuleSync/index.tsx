import type { AiToolWithLogo } from '@/hooks/useAiTools';
import { Avatar, Button, Card, message, Modal, Popconfirm, Space, Spin } from 'antd';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CodeEditor from '@/components/CodeEditor';
import { useAiTools } from '@/hooks/useAiTools';
import { expandPath } from '@/utils/path';

const AGENTS_FILE = 'AGENTS.md';

const RuleSync = memo(() => {
  const { t } = useTranslation();
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
    const fullPath = await expandPath(tool.ruleTargetPath);
    const result = await window.electronAPI.writeFile(fullPath, code);
    if (result.success) {
      message.success(t('ruleSync.syncSuccess', { toolName: tool.name }));
    }
    else {
      message.error(t('ruleSync.syncFailed', { error: result.error ?? t('common.unknownError') }));
    }
  };

  const handleView = async (tool: AiToolWithLogo) => {
    if (!tool.ruleTargetPath) return;
    const fullPath = await expandPath(tool.ruleTargetPath);
    const result = await window.electronAPI.readFile(fullPath);
    setViewingTool(tool);
    setViewingContent(result.success ? (result.content ?? '') : '');
    setViewModalOpen(true);
  };

  const handleViewingContentChange = async (value: string | undefined) => {
    const newValue = value ?? '';
    setViewingContent(newValue);
    if (viewingTool?.ruleTargetPath) {
      const fullPath = await expandPath(viewingTool.ruleTargetPath);
      void window.electronAPI.writeFile(fullPath, newValue);
    }
  };

  if (toolsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spin tip={t('common.loading')}>
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
                {tool.logoSrc && <Avatar src={tool.logoSrc} size="small" shape="square" />}
                <span>{tool.name}</span>
              </Space>
            )}
            hoverable
          >
            <Space>
              <Popconfirm
                title={t('ruleSync.confirmSyncTitle')}
                description={t('ruleSync.confirmSyncDescription', { toolName: tool.name })}
                onConfirm={() => void handleSync(tool)}
                okText={t('common.confirm')}
                cancelText={t('common.cancel')}
              >
                <Button type="primary">{t('ruleSync.syncButton')}</Button>
              </Popconfirm>
              <Button onClick={() => void handleView(tool)}>{t('ruleSync.viewButton')}</Button>
            </Space>
          </Card>
        ))}
      </div>
      <Modal
        title={
          viewingTool
            ? t('ruleSync.viewModalTitle', { toolName: viewingTool.name })
            : t('ruleSync.viewModalTitleDefault')
        }
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

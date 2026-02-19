import type { AiTool, McpServerWithStatus } from './types';
import { Avatar, Button, Card, Popconfirm, Switch } from 'antd';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAiTools } from '@/hooks/useAiTools';

interface McpServerCardProps {
  server: McpServerWithStatus;
  onEdit: (server: McpServerWithStatus) => void;
  onDelete: (serverName: string) => void;
  onToggleTool: (serverName: string, toolId: string, checked: boolean) => void;
}

const McpServerCard = memo<McpServerCardProps>(({
  server,
  onEdit,
  onDelete,
  onToggleTool,
}) => {
  const { t } = useTranslation();
  const { mcpTools } = useAiTools();

  return (
    <Card
      title={server.name}
      hoverable
      extra={(
        <div className="flex gap-2">
          <Button size="small" onClick={() => onEdit(server)}>{t('mcpSync.card.editButton')}</Button>
          <Popconfirm
            title={t('mcpSync.card.confirmDeleteTitle')}
            description={t('mcpSync.card.confirmDeleteDescription', { serverName: server.name })}
            onConfirm={() => void onDelete(server.name)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Button size="small" danger>{t('mcpSync.card.deleteButton')}</Button>
          </Popconfirm>
        </div>
      )}
    >
      <div className="flex flex-col">
        {mcpTools.map(tool => (
          <div key={tool.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center gap-2">
              {tool.logoSrc && <Avatar src={tool.logoSrc} size="small" shape="square" />}
              <span>{tool.name}</span>
            </div>
            <Switch
              size="small"
              checked={server.toolStatus[tool.id as AiTool]}
              onChange={checked => void onToggleTool(server.name, tool.id, checked)}
            />
          </div>
        ))}
      </div>
    </Card>
  );
});

export default McpServerCard;

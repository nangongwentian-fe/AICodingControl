import type { AiTool, McpServerWithStatus } from './types';
import { Avatar, Button, Card, Popconfirm, Switch } from 'antd';
import { memo } from 'react';
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
  const { mcpTools } = useAiTools();

  return (
    <Card
      title={server.name}
      hoverable
      extra={(
        <div className="flex gap-2">
          <Button size="small" onClick={() => onEdit(server)}>编辑</Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除 ${server.name} 吗？将从所有工具中移除。`}
            onConfirm={() => void onDelete(server.name)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" danger>删除</Button>
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

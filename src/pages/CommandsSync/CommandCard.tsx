import type { AiToolId } from '@/types/ai-tools';
import type { CommandItem, CommandTool } from './types';
import { Avatar, Button, Card, Switch } from 'antd';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

export interface CommandCardProps {
  command: CommandItem;
  tools: CommandTool[];
  onToggleTool: (commandName: string, toolId: AiToolId, enabled: boolean) => void;
  onEditCommand: (commandName: string) => void;
}

function CommandCard({ command, tools, onToggleTool, onEditCommand }: CommandCardProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Card
      title={command.name}
      extra={(
        <Button size="small" onClick={() => onEditCommand(command.name)}>
          {t('common.edit')}
        </Button>
      )}
      hoverable
    >
      <div className="flex flex-col">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0"
          >
            <div className="flex items-center gap-2">
              {tool.logoSrc && <Avatar src={tool.logoSrc} size="small" shape="square" />}
              <span>{tool.name}</span>
            </div>
            <Switch
              size="small"
              checked={Boolean(command.toolStatus[tool.id as AiToolId])}
              onChange={(checked) => onToggleTool(command.name, tool.id as AiToolId, checked)}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

const MemoizedCommandCard = memo(CommandCard);

export default MemoizedCommandCard;

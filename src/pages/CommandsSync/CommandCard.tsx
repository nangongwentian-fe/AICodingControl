import type { AiToolId } from '@/types/ai-tools';
import type { CommandItem, CommandTool } from './types';
import { Avatar, Card, Switch } from 'antd';
import { memo } from 'react';

export interface CommandCardProps {
  command: CommandItem;
  tools: CommandTool[];
  onToggleTool: (commandName: string, toolId: AiToolId, enabled: boolean) => void;
}

function CommandCard({ command, tools, onToggleTool }: CommandCardProps): JSX.Element {
  return (
    <Card title={command.name} hoverable>
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
              checked={command.toolStatus[tool.id as AiToolId]}
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

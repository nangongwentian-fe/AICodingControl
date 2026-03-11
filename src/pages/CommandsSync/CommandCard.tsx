import type { AiToolId } from '@/types/ai-tools';
import type { CommandItem, CommandTool } from './types';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';

export interface CommandCardProps {
  command: CommandItem;
  tools: CommandTool[];
  onToggleTool: (commandName: string, toolId: AiToolId, enabled: boolean) => void;
  onEditCommand: (commandName: string) => void;
}

function CommandCard({ command, tools, onToggleTool, onEditCommand }: CommandCardProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{command.name}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => onEditCommand(command.name)}>
          {t('common.edit')}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="flex items-center justify-between border-b border-border py-2 last:border-b-0"
            >
              <div className="flex items-center gap-2">
                {tool.logoSrc && (
                  <Avatar className="h-6 w-6 rounded-sm">
                    <AvatarImage src={tool.logoSrc} />
                  </Avatar>
                )}
                <span className="text-sm">{tool.name}</span>
              </div>
              <Switch
                checked={Boolean(command.toolStatus[tool.id as AiToolId])}
                onCheckedChange={(checked) => onToggleTool(command.name, tool.id as AiToolId, checked)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const MemoizedCommandCard = memo(CommandCard);

export default MemoizedCommandCard;

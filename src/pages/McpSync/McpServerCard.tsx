import type { AiTool, McpServerWithStatus } from './types';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">{server.name}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(server)}>
            {t('mcpSync.card.editButton')}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">{t('mcpSync.card.deleteButton')}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('mcpSync.card.confirmDeleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('mcpSync.card.confirmDeleteDescription', { serverName: server.name })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => void onDelete(server.name)}>
                  {t('common.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          {mcpTools.map(tool => (
            <div key={tool.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
              <div className="flex items-center gap-2">
                {tool.logoSrc && (
                  <Avatar className="h-6 w-6 rounded-sm">
                    <AvatarImage src={tool.logoSrc} />
                  </Avatar>
                )}
                <span className="text-sm">{tool.name}</span>
              </div>
              <Switch
                checked={server.toolStatus[tool.id as AiTool]}
                onCheckedChange={checked => void onToggleTool(server.name, tool.id, checked)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

export default McpServerCard;

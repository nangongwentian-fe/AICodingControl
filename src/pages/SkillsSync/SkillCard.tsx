import type { AiToolId } from '@/types/ai-tools';
import type { SkillItem, SkillTool } from './types';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';
import { memo, useCallback, useState } from 'react';
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
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { expandPath, joinPath } from '@/utils/path';

export interface SkillCardProps {
  skill: SkillItem;
  tools: SkillTool[];
  onToggleTool: (skillName: string, toolId: AiToolId, enabled: boolean) => void;
}

function SkillCard({ skill, tools, onToggleTool }: SkillCardProps): JSX.Element {
  const { t } = useTranslation();
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState<string>('');
  const [enabledToolsForDialog, setEnabledToolsForDialog] = useState<SkillTool[]>([]);

  const openSkillFolderByTool = useCallback(async (tool: SkillTool): Promise<void> => {
    const toolRoot = await expandPath(tool.skillsPath);
    const skillPath = joinPath(toolRoot, skill.name);
    const result = await window.electronAPI.openPath(skillPath);
    if (!result.success) {
      toast.error(t('skillsSync.openFailed', { error: result.error ?? t('common.unknownError') }));
    }
  }, [skill.name, t]);

  const handleOpenFolder = useCallback(async () => {
    const enabledTools = tools.filter((tool) => Boolean(skill.toolStatus[tool.id as AiToolId]));

    if (enabledTools.length === 0) {
      toast.warning(t('skillsSync.notEnabledAnyTool'));
      return;
    }

    if (enabledTools.length === 1) {
      await openSkillFolderByTool(enabledTools[0]);
      return;
    }

    setEnabledToolsForDialog(enabledTools);
    setSelectedToolId(enabledTools[0].id);
    setSelectDialogOpen(true);
  }, [openSkillFolderByTool, skill.toolStatus, t, tools]);

  const handleConfirmOpen = useCallback(async () => {
    const selectedTool = enabledToolsForDialog.find((tool) => tool.id === selectedToolId);
    if (!selectedTool) {
      toast.error(t('skillsSync.toolNotFoundToOpen'));
      return;
    }
    await openSkillFolderByTool(selectedTool);
    setSelectDialogOpen(false);
  }, [enabledToolsForDialog, openSkillFolderByTool, selectedToolId, t]);

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">{skill.name}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleOpenFolder()}
          >
            <Icon icon="mdi:folder-open-outline" width={16} height={16} />
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
                  checked={Boolean(skill.toolStatus[tool.id as AiToolId])}
                  onCheckedChange={(checked) => onToggleTool(skill.name, tool.id as AiToolId, checked)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={selectDialogOpen} onOpenChange={(open) => { if (!open) setSelectDialogOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('skillsSync.selectToolToOpenTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('skillsSync.selectToolToOpenDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <Select value={selectedToolId} onValueChange={setSelectedToolId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enabledToolsForDialog.map((tool) => (
                <SelectItem key={tool.id} value={tool.id}>{tool.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmOpen()}>
              {t('common.open')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const MemoizedSkillCard = memo(SkillCard);

export default MemoizedSkillCard;

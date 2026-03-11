import type { AiToolId } from '@/types/ai-tools';
import type { SkillItem, SkillTool, SkillToolStatus } from './types';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import compact from 'lodash/compact';
import keyBy from 'lodash/keyBy';
import some from 'lodash/some';
import sortBy from 'lodash/sortBy';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
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
import { useAiTools } from '@/hooks/useAiTools';
import { expandPath, joinPath } from '@/utils/path';
import SkillCard from './SkillCard';
import { SKILL_DEFINITION_FILE } from './const';

function SkillsSync(): JSX.Element {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    skillName: string;
    toolId: AiToolId;
    targetName: string;
  } | null>(null);

  const { tools, loading: toolsLoading } = useAiTools();

  const skillTools = useMemo<SkillTool[]>(() => {
    return tools
      .filter((tool): tool is SkillTool => Boolean(tool.skillsPath))
      .map((tool) => ({
        ...tool,
        skillsPath: tool.skillsPath,
      }));
  }, [tools]);

  const skillsByName = useMemo(() => keyBy(skills, (skill) => skill.name), [skills]);

  const createEmptyToolStatus = useCallback((): SkillToolStatus => {
    return skillTools.reduce((acc, tool) => {
      const toolId = tool.id as AiToolId;
      acc[toolId] = false;
      return acc;
    }, {} as SkillToolStatus);
  }, [skillTools]);

  const filterSkillFolders = useCallback(async (rootPath: string, entries: string[]): Promise<string[]> => {
    const checks = await Promise.all(
      entries.map(async (entry) => {
        const skillFilePath = joinPath(rootPath, entry, SKILL_DEFINITION_FILE);
        const existsResult = await window.electronAPI.pathExists(skillFilePath);
        if (!existsResult.success || !existsResult.exists) return null;
        return entry;
      }),
    );
    return compact(checks);
  }, []);

  const loadAllSkills = useCallback(async (): Promise<void> => {
    if (skillTools.length === 0) {
      setSkills([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const settled = await Promise.allSettled(
      skillTools.map(async (tool) => {
        const skillsPath = await expandPath(tool.skillsPath);
        const dirResult = await window.electronAPI.readDir(skillsPath);
        if (!dirResult.success || !dirResult.exists) {
          return { toolId: tool.id as AiToolId, skills: [] as string[] };
        }

        const entries = dirResult.entries ?? [];
        const filteredSkills = await filterSkillFolders(skillsPath, entries);

        return { toolId: tool.id as AiToolId, skills: filteredSkills };
      }),
    );

    const fulfilled = settled
      .filter((item): item is PromiseFulfilledResult<{ toolId: AiToolId; skills: string[] }> => item.status === 'fulfilled')
      .map((item) => item.value);

    if (fulfilled.length !== settled.length) {
      toast.error(t('skillsSync.partialReadFailed'));
    }

    const skillMap = new Map<string, SkillItem>();

    for (const { toolId, skills: toolSkills } of fulfilled) {
      for (const skillName of toolSkills) {
        const existing = skillMap.get(skillName);
        if (existing) {
          existing.toolStatus[toolId] = true;
        } else {
          const toolStatus = createEmptyToolStatus();
          toolStatus[toolId] = true;
          skillMap.set(skillName, { name: skillName, toolStatus });
        }
      }
    }

    const mergedSkills = sortBy(Array.from(skillMap.values()), (skill) => skill.name.toLowerCase());
    setSkills(mergedSkills);
    setLoading(false);
  }, [createEmptyToolStatus, filterSkillFolders, skillTools, t]);

  const updateSkillStatus = useCallback((skillName: string, toolId: AiToolId, enabled: boolean): void => {
    setSkills((prev) => {
      const existing = prev.find((skill) => skill.name === skillName);

      if (!existing) {
        if (!enabled) return prev;
        const toolStatus = createEmptyToolStatus();
        toolStatus[toolId] = true;
        return sortBy([...prev, { name: skillName, toolStatus }], (skill) => skill.name.toLowerCase());
      }

      const updated = prev.map((skill) => {
        if (skill.name !== skillName) return skill;
        return {
          ...skill,
          toolStatus: { ...skill.toolStatus, [toolId]: enabled },
        };
      });

      const filtered = updated.filter((skill) => some(skill.toolStatus));
      return sortBy(filtered, (skill) => skill.name.toLowerCase());
    });
  }, [createEmptyToolStatus]);

  const getSourceTools = useCallback((skillName: string, targetToolId: AiToolId): SkillTool[] => {
    const skill = skillsByName[skillName];
    if (!skill) return [];
    return skillTools.filter((tool) => tool.id !== targetToolId && skill.toolStatus[tool.id as AiToolId]);
  }, [skillTools, skillsByName]);

  const enableSkillForTool = useCallback(async (
    skillName: string,
    targetToolId: AiToolId,
  ): Promise<boolean> => {
    const targetTool = skillTools.find((tool) => tool.id === targetToolId);
    if (!targetTool) {
      toast.error(t('skillsSync.toolConfigNotFound'));
      return false;
    }

    const sources = getSourceTools(skillName, targetToolId);
    if (sources.length === 0) {
      toast.error(t('skillsSync.sourceNotFound'));
      return false;
    }

    const sourceRoot = await expandPath(sources[0].skillsPath);
    const sourcePath = joinPath(sourceRoot, skillName);
    const targetRoot = await expandPath(targetTool.skillsPath);
    const targetPath = joinPath(targetRoot, skillName);

    const copyResult = await window.electronAPI.copyDir(sourcePath, targetPath);
    if (!copyResult.success) {
      toast.error(t('skillsSync.copyFailed', { error: copyResult.error ?? t('common.unknownError') }));
      return false;
    }

    return true;
  }, [getSourceTools, skillTools, t]);

  const removeSkillFromTool = useCallback(async (skillName: string, toolId: AiToolId): Promise<boolean> => {
    const tool = skillTools.find((item) => item.id === toolId);
    if (!tool) {
      toast.error(t('skillsSync.toolConfigNotFound'));
      return false;
    }

    const targetRoot = await expandPath(tool.skillsPath);
    const targetPath = joinPath(targetRoot, skillName);
    const result = await window.electronAPI.removeDir(targetPath);

    if (!result.success) {
      toast.error(t('skillsSync.removeFailed', { error: result.error ?? t('common.unknownError') }));
      return false;
    }

    return true;
  }, [skillTools, t]);

  const handleEnableSkill = useCallback(async (skillName: string, toolId: AiToolId): Promise<void> => {
    const targetToolName = skillTools.find((tool) => tool.id === toolId)?.name ?? t('common.targetTool');

    updateSkillStatus(skillName, toolId, true);
    const ok = await enableSkillForTool(skillName, toolId);
    if (ok) {
      toast.success(t('skillsSync.syncSuccess', { toolName: targetToolName }));
    } else {
      updateSkillStatus(skillName, toolId, false);
    }
  }, [enableSkillForTool, skillTools, t, updateSkillStatus]);

  const handleDisableSkill = useCallback((skillName: string, toolId: AiToolId): void => {
    const targetTool = skillTools.find((tool) => tool.id === toolId);
    const targetName = targetTool?.name ?? t('common.targetTool');
    setConfirmDialog({ skillName, toolId, targetName });
  }, [skillTools, t]);

  const handleConfirmRemove = useCallback(async () => {
    if (!confirmDialog) return;
    const { skillName, toolId, targetName } = confirmDialog;
    const ok = await removeSkillFromTool(skillName, toolId);
    if (ok) {
      updateSkillStatus(skillName, toolId, false);
      toast.success(t('skillsSync.removeSuccess', { targetName }));
    }
    setConfirmDialog(null);
  }, [confirmDialog, removeSkillFromTool, t, updateSkillStatus]);

  const handleToggleTool = useCallback(async (skillName: string, toolId: AiToolId, enabled: boolean): Promise<void> => {
    if (enabled) {
      await handleEnableSkill(skillName, toolId);
      return;
    }

    handleDisableSkill(skillName, toolId);
  }, [handleDisableSkill, handleEnableSkill]);

  useEffect(() => {
    if (toolsLoading) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void loadAllSkills();
    });
    return () => {
      cancelled = true;
    };
  }, [loadAllSkills, toolsLoading]);

  const isLoading = toolsLoading || loading;

  let content: JSX.Element;

  if (isLoading && skills.length === 0) {
    content = <Spinner tip={t('common.loading')} />;
  } else if (skillTools.length === 0) {
    content = <EmptyState description={t('skillsSync.emptyUnsupportedTools')} />;
  } else if (skills.length === 0) {
    content = <EmptyState description={t('skillsSync.emptyNoSkills')} />;
  } else {
    content = (
      <div className="grid grid-cols-3 gap-4">
        {skills.map((skill) => (
          <SkillCard
            key={skill.name}
            skill={skill}
            tools={skillTools}
            onToggleTool={handleToggleTool}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">{t('skillsSync.title')}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadAllSkills()} disabled={isLoading}>
            <Icon icon="mdi:refresh" width={16} height={16} />
            {t('common.refresh')}
          </Button>
          <Button onClick={() => window.electronAPI.openExternal('https://skills.sh/')}>
            {t('skillsSync.installSkills')}
          </Button>
        </div>
      </div>

      {content}

      <AlertDialog open={!!confirmDialog} onOpenChange={(open) => { if (!open) setConfirmDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('skillsSync.confirmRemoveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('skillsSync.confirmRemoveContent', {
                targetName: confirmDialog?.targetName,
                skillName: confirmDialog?.skillName,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmRemove()}>
              {t('common.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const MemoizedSkillsSync = memo(SkillsSync);

export default MemoizedSkillsSync;

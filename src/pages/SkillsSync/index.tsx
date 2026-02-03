import type { AiToolId } from '@/types/ai-tools';
import type { SkillItem, SkillTool, SkillToolStatus, SyncRequest } from './types';
import { Button, Empty, message, Modal, Select, Spin } from 'antd';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ReloadOutlined } from '@ant-design/icons';
import * as lodash from 'lodash';
import { useAiTools } from '@/hooks/useAiTools';
import SkillCard from './SkillCard';
import { SKILL_DEFINITION_FILE, SKILL_TOOL_PATHS } from './const';

function joinPath(...parts: string[]): string {
  const normalized = parts
    .filter(Boolean)
    .map((part, index) => {
      if (index === 0) return part.replace(/\/$/, '');
      return part.replace(/^\/+/, '').replace(/\/$/, '');
    });
  return normalized.join('/');
}

function SkillsSync(): JSX.Element {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncRequest, setSyncRequest] = useState<SyncRequest | null>(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncSourceToolId, setSyncSourceToolId] = useState<AiToolId | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { tools, loading: toolsLoading } = useAiTools();

  const skillTools = useMemo<SkillTool[]>(() => {
    return tools
      .filter((tool) => Boolean(SKILL_TOOL_PATHS[tool.id as AiToolId]))
      .map((tool) => ({
        ...tool,
        skillsPath: SKILL_TOOL_PATHS[tool.id as AiToolId],
      }));
  }, [tools]);

  const skillsByName = useMemo(() => lodash.keyBy(skills, (skill) => skill.name), [skills]);

  const createEmptyToolStatus = useCallback((): SkillToolStatus => {
    const toolIds = Object.keys(SKILL_TOOL_PATHS) as AiToolId[];
    return toolIds.reduce((acc, toolId) => {
      acc[toolId] = false;
      return acc;
    }, {} as SkillToolStatus);
  }, []);

  const expandPath = useCallback(async (path: string): Promise<string> => {
    if (path.startsWith('~/')) {
      const homeDir = await window.electronAPI.getHomeDir();
      return path.replace('~', homeDir);
    }
    return path;
  }, []);

  const filterSkillFolders = useCallback(async (rootPath: string, entries: string[]): Promise<string[]> => {
    const checks = await Promise.all(
      entries.map(async (entry) => {
        const skillFilePath = joinPath(rootPath, entry, SKILL_DEFINITION_FILE);
        const existsResult = await window.electronAPI.pathExists(skillFilePath);
        if (!existsResult.success || !existsResult.exists) return null;
        return entry;
      }),
    );
    return lodash.compact(checks);
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
      message.error('部分 Skills 读取失败');
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

    const mergedSkills = lodash.sortBy(Array.from(skillMap.values()), (skill) => skill.name.toLowerCase());
    setSkills(mergedSkills);
    setLoading(false);
  }, [createEmptyToolStatus, expandPath, filterSkillFolders, skillTools]);

  const updateSkillStatus = useCallback((skillName: string, toolId: AiToolId, enabled: boolean): void => {
    setSkills((prev) => {
      const existing = prev.find((skill) => skill.name === skillName);

      if (!existing) {
        if (!enabled) return prev;
        const toolStatus = createEmptyToolStatus();
        toolStatus[toolId] = true;
        return lodash.sortBy([...prev, { name: skillName, toolStatus }], (skill) => skill.name.toLowerCase());
      }

      const updated = prev.map((skill) => {
        if (skill.name !== skillName) return skill;
        return {
          ...skill,
          toolStatus: { ...skill.toolStatus, [toolId]: enabled },
        };
      });

      const filtered = updated.filter((skill) => lodash.some(skill.toolStatus));
      return lodash.sortBy(filtered, (skill) => skill.name.toLowerCase());
    });
  }, [createEmptyToolStatus]);

  const getSourceTools = useCallback((skillName: string, targetToolId: AiToolId): SkillTool[] => {
    const skill = skillsByName[skillName];
    if (!skill) return [];
    return skillTools.filter((tool) => tool.id !== targetToolId && skill.toolStatus[tool.id as AiToolId]);
  }, [skillTools, skillsByName]);

  const syncSkillBetweenTools = useCallback(async (
    skillName: string,
    sourceToolId: AiToolId,
    targetToolId: AiToolId,
  ): Promise<boolean> => {
    const sourceTool = skillTools.find((tool) => tool.id === sourceToolId);
    const targetTool = skillTools.find((tool) => tool.id === targetToolId);

    if (!sourceTool || !targetTool) {
      message.error('未找到对应的工具配置');
      return false;
    }

    const sourceRoot = await expandPath(sourceTool.skillsPath);
    const targetRoot = await expandPath(targetTool.skillsPath);
    const sourcePath = joinPath(sourceRoot, skillName);
    const targetPath = joinPath(targetRoot, skillName);

    const sourceExists = await window.electronAPI.pathExists(sourcePath);
    if (!sourceExists.success || !sourceExists.exists) {
      message.error('源 Skill 不存在');
      return false;
    }

    const result = await window.electronAPI.copyDir(sourcePath, targetPath);
    if (!result.success) {
      message.error(`同步失败: ${result.error ?? '未知错误'}`);
      return false;
    }

    return true;
  }, [expandPath, skillTools]);

  const removeSkillFromTool = useCallback(async (skillName: string, toolId: AiToolId): Promise<boolean> => {
    const tool = skillTools.find((item) => item.id === toolId);
    if (!tool) {
      message.error('未找到对应的工具配置');
      return false;
    }

    const targetRoot = await expandPath(tool.skillsPath);
    const targetPath = joinPath(targetRoot, skillName);
    const result = await window.electronAPI.removeDir(targetPath);

    if (!result.success) {
      message.error(`移除失败: ${result.error ?? '未知错误'}`);
      return false;
    }

    return true;
  }, [expandPath, skillTools]);

  const handleEnableSkill = useCallback(async (skillName: string, toolId: AiToolId): Promise<void> => {
    const sources = getSourceTools(skillName, toolId);
    const targetToolName = skillTools.find((tool) => tool.id === toolId)?.name ?? '目标工具';

    if (sources.length === 0) {
      message.error('未找到可同步的来源');
      return;
    }

    if (sources.length === 1) {
      updateSkillStatus(skillName, toolId, true);
      const ok = await syncSkillBetweenTools(skillName, sources[0].id as AiToolId, toolId);
      if (ok) {
        message.success(`已同步到 ${targetToolName}`);
      } else {
        updateSkillStatus(skillName, toolId, false);
      }
      return;
    }

    setSyncRequest({ skillName, targetToolId: toolId });
    setSyncSourceToolId(sources[0].id as AiToolId);
    setSyncModalOpen(true);
  }, [getSourceTools, skillTools, syncSkillBetweenTools, updateSkillStatus]);

  const handleDisableSkill = useCallback((skillName: string, toolId: AiToolId): void => {
    const targetTool = skillTools.find((tool) => tool.id === toolId);
    const targetName = targetTool?.name ?? '目标工具';

    Modal.confirm({
      title: '确认移除',
      content: `确定要从 ${targetName} 移除 ${skillName} 吗？`,
      okText: '移除',
      cancelText: '取消',
      onOk: async () => {
        const ok = await removeSkillFromTool(skillName, toolId);
        if (ok) {
          updateSkillStatus(skillName, toolId, false);
          message.success(`已从 ${targetName} 移除`);
        }
      },
    });
  }, [removeSkillFromTool, skillTools, updateSkillStatus]);

  const handleToggleTool = useCallback(async (skillName: string, toolId: AiToolId, enabled: boolean): Promise<void> => {
    if (enabled) {
      await handleEnableSkill(skillName, toolId);
      return;
    }

    handleDisableSkill(skillName, toolId);
  }, [handleDisableSkill, handleEnableSkill]);

  const handleSyncConfirm = useCallback(async (): Promise<void> => {
    if (!syncRequest || !syncSourceToolId) return;

    setSyncing(true);
    updateSkillStatus(syncRequest.skillName, syncRequest.targetToolId, true);

    const ok = await syncSkillBetweenTools(
      syncRequest.skillName,
      syncSourceToolId,
      syncRequest.targetToolId,
    );

    if (ok) {
      message.success('同步成功');
    } else {
      updateSkillStatus(syncRequest.skillName, syncRequest.targetToolId, false);
    }

    setSyncing(false);
    setSyncModalOpen(false);
    setSyncRequest(null);
    setSyncSourceToolId(null);
  }, [syncRequest, syncSourceToolId, syncSkillBetweenTools, updateSkillStatus]);

  const handleSyncCancel = useCallback((): void => {
    setSyncModalOpen(false);
    setSyncRequest(null);
    setSyncSourceToolId(null);
  }, []);

  const sourceOptions = useMemo(() => {
    if (!syncRequest) return [];
    const sources = getSourceTools(syncRequest.skillName, syncRequest.targetToolId);
    return sources.map((tool) => ({ label: tool.name, value: tool.id }));
  }, [getSourceTools, syncRequest]);

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
    content = (
      <div className="flex justify-center py-16">
        <Spin tip="加载中...">
          <div className="p-12" />
        </Spin>
      </div>
    );
  } else if (skillTools.length === 0) {
    content = <Empty description="暂无支持 Skills 的工具" />;
  } else if (skills.length === 0) {
    content = <Empty description="暂无 Skills" />;
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
        <h2 className="text-lg font-medium">Skills 列表</h2>
        <div className="flex gap-2">
          <Button icon={<ReloadOutlined />} onClick={() => void loadAllSkills()} loading={isLoading}>
            刷新
          </Button>
        </div>
      </div>

      {content}

      <Modal
        title="选择同步来源"
        open={syncModalOpen}
        onOk={() => void handleSyncConfirm()}
        onCancel={handleSyncCancel}
        okText="同步"
        cancelText="取消"
        confirmLoading={syncing}
      >
        {syncRequest ? (
          <div className="space-y-3">
            <div>
              将 <span className="font-medium">{syncRequest.skillName}</span> 同步到
              <span className="ml-1 font-medium">
                {skillTools.find((tool) => tool.id === syncRequest.targetToolId)?.name ?? '目标工具'}
              </span>
            </div>
            <Select
              className="w-full"
              placeholder="选择来源工具"
              options={sourceOptions}
              value={syncSourceToolId ?? undefined}
              onChange={(value) => setSyncSourceToolId(value as AiToolId)}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

const MemoizedSkillsSync = memo(SkillsSync);

export default MemoizedSkillsSync;

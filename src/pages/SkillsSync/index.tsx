import type { AiToolId } from '@/types/ai-tools';
import type { SkillItem, SkillTool, SkillToolStatus } from './types';
import { Button, Empty, message, Modal, Spin } from 'antd';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ReloadOutlined } from '@ant-design/icons';
import compact from 'lodash/compact';
import keyBy from 'lodash/keyBy';
import some from 'lodash/some';
import sortBy from 'lodash/sortBy';
import { useAiTools } from '@/hooks/useAiTools';
import { expandPath, joinPath } from '@/utils/path';
import SkillCard from './SkillCard';
import { SKILL_DEFINITION_FILE } from './const';

function SkillsSync(): JSX.Element {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(false);

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

    const mergedSkills = sortBy(Array.from(skillMap.values()), (skill) => skill.name.toLowerCase());
    setSkills(mergedSkills);
    setLoading(false);
  }, [createEmptyToolStatus, filterSkillFolders, skillTools]);

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

  /** 为目标工具启用 skill：从源工具复制 skill 到目标工具 */
  const enableSkillForTool = useCallback(async (
    skillName: string,
    targetToolId: AiToolId,
  ): Promise<boolean> => {
    const targetTool = skillTools.find((tool) => tool.id === targetToolId);
    if (!targetTool) {
      message.error('未找到对应的工具配置');
      return false;
    }

    // 从已有的源工具复制
    const sources = getSourceTools(skillName, targetToolId);
    if (sources.length === 0) {
      message.error('未找到可同步的来源');
      return false;
    }

    const sourceRoot = await expandPath(sources[0].skillsPath);
    const sourcePath = joinPath(sourceRoot, skillName);
    const targetRoot = await expandPath(targetTool.skillsPath);
    const targetPath = joinPath(targetRoot, skillName);

    // 复制到目标工具目录
    const copyResult = await window.electronAPI.copyDir(sourcePath, targetPath);
    if (!copyResult.success) {
      message.error(`复制失败: ${copyResult.error ?? '未知错误'}`);
      return false;
    }

    return true;
  }, [getSourceTools, skillTools]);

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
  }, [skillTools]);

  const handleEnableSkill = useCallback(async (skillName: string, toolId: AiToolId): Promise<void> => {
    const targetToolName = skillTools.find((tool) => tool.id === toolId)?.name ?? '目标工具';

    updateSkillStatus(skillName, toolId, true);
    const ok = await enableSkillForTool(skillName, toolId);
    if (ok) {
      message.success(`已同步到 ${targetToolName}`);
    } else {
      updateSkillStatus(skillName, toolId, false);
    }
  }, [enableSkillForTool, skillTools, updateSkillStatus]);

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
          <Button
            type="primary"
            onClick={() => window.electronAPI.openExternal('https://skills.sh/')}
          >
            安装Skills
          </Button>
        </div>
      </div>

      {content}
    </div>
  );
}

const MemoizedSkillsSync = memo(SkillsSync);

export default MemoizedSkillsSync;

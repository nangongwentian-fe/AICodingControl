import type { AiToolId } from '@/types/ai-tools';
import type { SkillItem, SkillTool } from './types';
import { Avatar, Button, Card, message, Modal, Select, Switch } from 'antd';
import { memo, useCallback } from 'react';
import { FolderOpenOutlined } from '@ant-design/icons';
import { expandPath, joinPath } from '@/utils/path';

export interface SkillCardProps {
  skill: SkillItem;
  tools: SkillTool[];
  onToggleTool: (skillName: string, toolId: AiToolId, enabled: boolean) => void;
}

function SkillCard({ skill, tools, onToggleTool }: SkillCardProps): JSX.Element {
  const openSkillFolderByTool = useCallback(async (tool: SkillTool): Promise<void> => {
    const toolRoot = await expandPath(tool.skillsPath);
    const skillPath = joinPath(toolRoot, skill.name);
    const result = await window.electronAPI.openPath(skillPath);
    if (!result.success) {
      message.error(`打开失败: ${result.error ?? '未知错误'}`);
    }
  }, [skill.name]);

  const handleOpenFolder = useCallback(async () => {
    const enabledTools = tools.filter((tool) => Boolean(skill.toolStatus[tool.id as AiToolId]));

    if (enabledTools.length === 0) {
      message.warning('该 Skill 尚未在任何工具中启用');
      return;
    }

    if (enabledTools.length === 1) {
      await openSkillFolderByTool(enabledTools[0]);
      return;
    }

    let selectedToolId = enabledTools[0].id as AiToolId;

    Modal.confirm({
      title: '选择要打开的工具',
      okText: '打开',
      cancelText: '取消',
      content: (
        <div className="mt-2">
          <p className="mb-2 text-[13px] text-gray-500">该 Skill 在多个工具中启用，请选择要打开的路径：</p>
          <Select
            className="w-full"
            defaultValue={selectedToolId}
            options={enabledTools.map((tool) => ({
              label: tool.name,
              value: tool.id,
            }))}
            onChange={(value) => {
              selectedToolId = value as AiToolId;
            }}
          />
        </div>
      ),
      onOk: async () => {
        const selectedTool = enabledTools.find((tool) => tool.id === selectedToolId);
        if (!selectedTool) {
          message.error('未找到要打开的工具');
          return;
        }
        await openSkillFolderByTool(selectedTool);
      },
    });
  }, [openSkillFolderByTool, skill.toolStatus, tools]);

  return (
    <Card
      title={skill.name}
      extra={
        <Button
          type="text"
          size="small"
          icon={<FolderOpenOutlined />}
          onClick={handleOpenFolder}
        />
      }
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
              checked={Boolean(skill.toolStatus[tool.id as AiToolId])}
              onChange={(checked) => onToggleTool(skill.name, tool.id as AiToolId, checked)}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

const MemoizedSkillCard = memo(SkillCard);

export default MemoizedSkillCard;

import type { AiToolId } from '@/types/ai-tools';
import type { SkillItem, SkillTool } from './types';
import { Avatar, Button, Card, message, Modal, Select, Switch } from 'antd';
import { memo, useCallback } from 'react';
import { FolderOpenOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { expandPath, joinPath } from '@/utils/path';

export interface SkillCardProps {
  skill: SkillItem;
  tools: SkillTool[];
  onToggleTool: (skillName: string, toolId: AiToolId, enabled: boolean) => void;
}

function SkillCard({ skill, tools, onToggleTool }: SkillCardProps): JSX.Element {
  const { t } = useTranslation();

  const openSkillFolderByTool = useCallback(async (tool: SkillTool): Promise<void> => {
    const toolRoot = await expandPath(tool.skillsPath);
    const skillPath = joinPath(toolRoot, skill.name);
    const result = await window.electronAPI.openPath(skillPath);
    if (!result.success) {
      message.error(t('skillsSync.openFailed', { error: result.error ?? t('common.unknownError') }));
    }
  }, [skill.name, t]);

  const handleOpenFolder = useCallback(async () => {
    const enabledTools = tools.filter((tool) => Boolean(skill.toolStatus[tool.id as AiToolId]));

    if (enabledTools.length === 0) {
      message.warning(t('skillsSync.notEnabledAnyTool'));
      return;
    }

    if (enabledTools.length === 1) {
      await openSkillFolderByTool(enabledTools[0]);
      return;
    }

    let selectedToolId = enabledTools[0].id as AiToolId;

    Modal.confirm({
      title: t('skillsSync.selectToolToOpenTitle'),
      okText: t('common.open'),
      cancelText: t('common.cancel'),
      content: (
        <div className="mt-2">
          <p className="mb-2 text-[13px] text-gray-500">{t('skillsSync.selectToolToOpenDescription')}</p>
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
          message.error(t('skillsSync.toolNotFoundToOpen'));
          return;
        }
        await openSkillFolderByTool(selectedTool);
      },
    });
  }, [openSkillFolderByTool, skill.toolStatus, t, tools]);

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

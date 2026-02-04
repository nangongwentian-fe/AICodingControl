import type { AiToolId } from '@/types/ai-tools';
import type { SkillItem, SkillTool } from './types';
import { Avatar, Card, Switch } from 'antd';
import { memo } from 'react';

export interface SkillCardProps {
  skill: SkillItem;
  tools: SkillTool[];
  onToggleTool: (skillName: string, toolId: AiToolId, enabled: boolean) => void;
}

function SkillCard({ skill, tools, onToggleTool }: SkillCardProps): JSX.Element {
  return (
    <Card title={skill.name} hoverable>
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

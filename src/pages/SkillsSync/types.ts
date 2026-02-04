import type { AiToolId } from '@/types/ai-tools';
import type { AiToolWithLogo } from '@/hooks/useAiTools';

export interface SkillTool extends AiToolWithLogo {
  skillsPath: string;
}

export type SkillToolStatus = Partial<Record<AiToolId, boolean>>;

export interface SkillItem {
  name: string;
  toolStatus: SkillToolStatus;
}

export interface SyncRequest {
  skillName: string;
  targetToolId: AiToolId;
}

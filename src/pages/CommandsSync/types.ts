import type { AiToolId } from '@/types/ai-tools';
import type { AiToolWithLogo } from '@/hooks/useAiTools';

export interface CommandTool extends AiToolWithLogo {
  commandsPath: string;
}

export type CommandToolStatus = Record<AiToolId, boolean>;

export interface CommandItem {
  name: string;
  toolStatus: CommandToolStatus;
}

export interface SyncRequest {
  commandName: string;
  targetToolId: AiToolId;
}

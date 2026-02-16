import type { AiToolId } from '@/types/ai-tools';
import type { AiToolWithLogo } from '@/hooks/useAiTools';

export interface CommandTool extends AiToolWithLogo {
  commandsPath: string;
}

export type CommandToolStatus = Partial<Record<AiToolId, boolean>>;

export interface CommandItem {
  name: string;
  toolStatus: CommandToolStatus;
}

export interface EditRequest {
  commandName: string;
}

export interface UploadedFile {
  name: string;
  file: File;
}

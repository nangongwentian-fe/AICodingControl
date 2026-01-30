import type { AiToolsConfig } from './ai-tools';

interface FileResult {
  success: boolean;
  content?: string;
  error?: string;
}

interface AiToolsResult {
  success: boolean;
  data?: AiToolsConfig;
  error?: string;
}

interface ElectronAPI {
  platform: string;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  readFile: (filePath: string) => Promise<FileResult>;
  writeFile: (filePath: string, content: string) => Promise<FileResult>;
  getDataDir: () => Promise<string>;
  getHomeDir: () => Promise<string>;
  getAiTools: () => Promise<AiToolsResult>;
  saveAiTools: (config: AiToolsConfig) => Promise<FileResult>;
}

import type { AiToolsConfig } from './ai-tools';

interface FileResult {
  success: boolean;
  content?: string;
  error?: string;
}

interface DirectoryResult {
  success: boolean;
  entries?: string[];
  exists?: boolean;
  error?: string;
}

interface ExistsResult {
  success: boolean;
  exists?: boolean;
  error?: string;
}

interface OperationResult {
  success: boolean;
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
  readDir: (dirPath: string) => Promise<DirectoryResult>;
  pathExists: (targetPath: string) => Promise<ExistsResult>;
  copyDir: (sourcePath: string, targetPath: string) => Promise<OperationResult>;
  removeDir: (targetPath: string) => Promise<OperationResult>;
  getDataDir: () => Promise<string>;
  getHomeDir: () => Promise<string>;
  getAiTools: () => Promise<AiToolsResult>;
  saveAiTools: (config: AiToolsConfig) => Promise<FileResult>;
}

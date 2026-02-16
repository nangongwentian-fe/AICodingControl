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

interface SymlinkCheckResult {
  success: boolean;
  isSymlink?: boolean;
  error?: string;
}

interface ElectronAPI {
  platform: string;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  readFile: (filePath: string) => Promise<FileResult>;
  writeFile: (filePath: string, content: string) => Promise<FileResult>;
  copyFile: (sourcePath: string, targetPath: string) => Promise<OperationResult>;
  removeFile: (targetPath: string) => Promise<OperationResult>;
  readDir: (dirPath: string) => Promise<DirectoryResult>;
  readDirFiles: (dirPath: string) => Promise<DirectoryResult>;
  pathExists: (targetPath: string) => Promise<ExistsResult>;
  copyDir: (sourcePath: string, targetPath: string) => Promise<OperationResult>;
  removeDir: (targetPath: string) => Promise<OperationResult>;
  getDataDir: () => Promise<string>;
  getHomeDir: () => Promise<string>;
  getAiTools: () => Promise<AiToolsResult>;
  saveAiTools: (config: AiToolsConfig) => Promise<FileResult>;
  openExternal: (url: string) => Promise<OperationResult>;
  openPath: (targetPath: string) => Promise<OperationResult>;
  createSymlink: (target: string, linkPath: string, type?: 'file' | 'dir') => Promise<OperationResult>;
  checkSymlink: (targetPath: string) => Promise<SymlinkCheckResult>;
  ensureDir: (dirPath: string) => Promise<OperationResult>;
  moveDir: (sourcePath: string, targetPath: string) => Promise<OperationResult>;
}

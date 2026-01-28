interface FileResult {
  success: boolean;
  content?: string;
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
}

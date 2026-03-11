import type { AiToolId } from '@/types/ai-tools';
import type { CommandItem, CommandTool, CommandToolStatus, EditRequest, UploadedFile } from './types';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';
import debounce from 'lodash/debounce';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import filter from 'lodash/filter';
import sortBy from 'lodash/sortBy';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { FileUpload } from '@/components/ui/file-upload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import CodeEditor from '@/components/CodeEditor';
import { useAiTools } from '@/hooks/useAiTools';
import { expandPath, joinPath } from '@/utils/path';
import CommandCard from './CommandCard';
import {
  ACCEPTED_COMMAND_EXTENSIONS,
  CENTRAL_COMMANDS_PATH,
  COMMAND_EDITOR_HEIGHT,
  COMMAND_FILE_EXTENSION,
} from './const';

function CommandsSync(): JSX.Element {
  const { t } = useTranslation();
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editRequest, setEditRequest] = useState<EditRequest | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editContent, setEditContent] = useState('');

  // 添加 Command 相关的状态
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [addLoading, setAddLoading] = useState(false);

  // 删除确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState<{
    commandName: string;
    toolId: AiToolId;
    targetName: string;
  } | null>(null);

  const { tools, loading: toolsLoading } = useAiTools();

  const commandTools = useMemo<CommandTool[]>(() => {
    return tools
      .filter((tool): tool is CommandTool => Boolean(tool.commandsPath))
      .map((tool) => ({
        ...tool,
        commandsPath: tool.commandsPath,
      }));
  }, [tools]);

  const createEmptyToolStatus = useCallback((): CommandToolStatus => {
    return commandTools.reduce((acc, tool) => {
      const toolId = tool.id as AiToolId;
      acc[toolId] = false;
      return acc;
    }, {} as CommandToolStatus);
  }, [commandTools]);

  const filterCommandFiles = useCallback((entries: string[]): string[] => {
    return filter(entries, (entry) => entry.toLowerCase().endsWith(COMMAND_FILE_EXTENSION));
  }, []);

  const loadAllCommands = useCallback(async (): Promise<void> => {
    if (commandTools.length === 0) {
      setCommands([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const centralRoot = await expandPath(CENTRAL_COMMANDS_PATH);
      const centralDirResult = await window.electronAPI.readDirFiles(centralRoot);
      const centralCommands = centralDirResult.success && centralDirResult.exists
        ? filterCommandFiles(centralDirResult.entries ?? [])
        : [];

      const settled = await Promise.allSettled(
        commandTools.map(async (tool) => {
          const commandsPath = await expandPath(tool.commandsPath);
          const dirResult = await window.electronAPI.readDirFiles(commandsPath);
          if (!dirResult.success || !dirResult.exists) {
            return { toolId: tool.id as AiToolId, commands: [] as string[] };
          }

          const entries = dirResult.entries ?? [];
          const filteredCommands = filterCommandFiles(entries);
          return { toolId: tool.id as AiToolId, commands: filteredCommands };
        }),
      );

      const fulfilled = settled
        .filter((item): item is PromiseFulfilledResult<{ toolId: AiToolId; commands: string[] }> => item.status === 'fulfilled')
        .map((item) => item.value);

      if (fulfilled.length !== settled.length || !centralDirResult.success) {
        toast.error(t('commandsSync.partialReadFailed'));
      }

      const commandMap = new Map<string, CommandItem>();

      for (const commandName of centralCommands) {
        if (!commandMap.has(commandName)) {
          commandMap.set(commandName, {
            name: commandName,
            toolStatus: createEmptyToolStatus(),
          });
        }
      }

      for (const { toolId, commands: toolCommands } of fulfilled) {
        for (const commandName of toolCommands) {
          const existing = commandMap.get(commandName);
          if (existing) {
            existing.toolStatus[toolId] = true;
          } else {
            const toolStatus = createEmptyToolStatus();
            toolStatus[toolId] = true;
            commandMap.set(commandName, { name: commandName, toolStatus });
          }
        }
      }

      const mergedCommands = sortBy(Array.from(commandMap.values()), (command) => command.name.toLowerCase());
      setCommands(mergedCommands);
    } finally {
      setLoading(false);
    }
  }, [commandTools, createEmptyToolStatus, filterCommandFiles, t]);

  const updateCommandStatus = useCallback((commandName: string, toolId: AiToolId, enabled: boolean): void => {
    setCommands((prev) => {
      const existing = prev.find((command) => command.name === commandName);

      if (!existing) {
        if (!enabled) return prev;
        const toolStatus = createEmptyToolStatus();
        toolStatus[toolId] = true;
        return sortBy([...prev, { name: commandName, toolStatus }], (command) => command.name.toLowerCase());
      }

      const updated = prev.map((command) => {
        if (command.name !== commandName) return command;
        return {
          ...command,
          toolStatus: { ...command.toolStatus, [toolId]: enabled },
        };
      });

      return sortBy(updated, (command) => command.name.toLowerCase());
    });
  }, [createEmptyToolStatus]);

  const getSourceTools = useCallback((commandName: string, targetToolId: AiToolId): CommandTool[] => {
    const command = commands.find((c) => c.name === commandName);
    if (!command) return [];
    return commandTools.filter((tool) => tool.id !== targetToolId && command.toolStatus[tool.id as AiToolId]);
  }, [commandTools, commands]);

  const getAllSourceTools = useCallback((commandName: string): CommandTool[] => {
    const command = commands.find((c) => c.name === commandName);
    if (!command) return [];
    return commandTools.filter((tool) => command.toolStatus[tool.id as AiToolId]);
  }, [commandTools, commands]);

  const ensureCentralCommandFile = useCallback(async (
    commandName: string,
    sources: CommandTool[],
  ): Promise<string | null> => {
    const centralRoot = await expandPath(CENTRAL_COMMANDS_PATH);
    await window.electronAPI.ensureDir(centralRoot);
    const centralCommandPath = joinPath(centralRoot, commandName);

    const centralExists = await window.electronAPI.pathExists(centralCommandPath);
    if (centralExists.success && centralExists.exists) {
      return centralCommandPath;
    }

    for (const sourceTool of sources) {
      const sourceRoot = await expandPath(sourceTool.commandsPath);
      const sourcePath = joinPath(sourceRoot, commandName);
      const sourceExists = await window.electronAPI.pathExists(sourcePath);
      if (!sourceExists.success || !sourceExists.exists) continue;

      const copyResult = await window.electronAPI.copyFile(sourcePath, centralCommandPath);
      if (copyResult.success) {
        return centralCommandPath;
      }
    }

    return null;
  }, []);

  const enableCommandForTool = useCallback(async (
    commandName: string,
    targetToolId: AiToolId,
  ): Promise<boolean> => {
    const targetTool = commandTools.find((tool) => tool.id === targetToolId);
    if (!targetTool) {
      toast.error(t('commandsSync.toolConfigNotFound'));
      return false;
    }

    const sources = getSourceTools(commandName, targetToolId);
    const centralCommandPath = await ensureCentralCommandFile(commandName, sources);
    if (!centralCommandPath) {
      toast.error(t('commandsSync.sourceNotFound'));
      return false;
    }

    const targetRoot = await expandPath(targetTool.commandsPath);
    const targetPath = joinPath(targetRoot, commandName);
    const result = await window.electronAPI.copyFile(centralCommandPath, targetPath);
    if (!result.success) {
      toast.error(t('commandsSync.copyTargetFailed', { error: result.error ?? t('common.unknownError') }));
      return false;
    }

    return true;
  }, [commandTools, ensureCentralCommandFile, getSourceTools, t]);

  const removeCommandFromTool = useCallback(async (commandName: string, toolId: AiToolId): Promise<boolean> => {
    const tool = commandTools.find((item) => item.id === toolId);
    if (!tool) {
      toast.error(t('commandsSync.toolConfigNotFound'));
      return false;
    }

    const targetRoot = await expandPath(tool.commandsPath);
    const targetPath = joinPath(targetRoot, commandName);
    const result = await window.electronAPI.removeFile(targetPath);

    if (!result.success) {
      toast.error(t('commandsSync.removeFailed', { error: result.error ?? t('common.unknownError') }));
      return false;
    }

    return true;
  }, [commandTools, t]);

  const handleEnableCommand = useCallback(async (commandName: string, toolId: AiToolId): Promise<void> => {
    const targetToolName = commandTools.find((tool) => tool.id === toolId)?.name ?? t('common.targetTool');

    updateCommandStatus(commandName, toolId, true);
    const ok = await enableCommandForTool(commandName, toolId);
    if (ok) {
      toast.success(t('commandsSync.syncSuccess', { toolName: targetToolName }));
    } else {
      updateCommandStatus(commandName, toolId, false);
    }
  }, [commandTools, enableCommandForTool, t, updateCommandStatus]);

  const handleDisableCommand = useCallback((commandName: string, toolId: AiToolId): void => {
    const targetTool = commandTools.find((tool) => tool.id === toolId);
    const targetName = targetTool?.name ?? t('common.targetTool');
    setConfirmDialog({ commandName, toolId, targetName });
  }, [commandTools, t]);

  const handleConfirmRemove = useCallback(async () => {
    if (!confirmDialog) return;
    const { commandName, toolId, targetName } = confirmDialog;

    const allSources = getAllSourceTools(commandName);
    const centralCommandPath = await ensureCentralCommandFile(commandName, allSources);
    if (!centralCommandPath) {
      toast.error(t('commandsSync.removeBackupNotFound'));
      setConfirmDialog(null);
      return;
    }

    const ok = await removeCommandFromTool(commandName, toolId);
    if (ok) {
      updateCommandStatus(commandName, toolId, false);
      await loadAllCommands();
      toast.success(t('commandsSync.removeSuccess', { targetName }));
    }
    setConfirmDialog(null);
  }, [confirmDialog, ensureCentralCommandFile, getAllSourceTools, loadAllCommands, removeCommandFromTool, t, updateCommandStatus]);

  const handleToggleTool = useCallback(async (commandName: string, toolId: AiToolId, enabled: boolean): Promise<void> => {
    if (enabled) {
      await handleEnableCommand(commandName, toolId);
      return;
    }

    handleDisableCommand(commandName, toolId);
  }, [handleDisableCommand, handleEnableCommand]);

  const getCentralCommandPath = useCallback(async (commandName: string): Promise<string> => {
    const centralRoot = await expandPath(CENTRAL_COMMANDS_PATH);
    await window.electronAPI.ensureDir(centralRoot);
    return joinPath(centralRoot, commandName);
  }, []);

  const handleOpenFolder = useCallback(async (): Promise<void> => {
    const centralRoot = await expandPath(CENTRAL_COMMANDS_PATH);
    await window.electronAPI.ensureDir(centralRoot);
    await window.electronAPI.openPath(centralRoot);
  }, []);

  const handleOpenEdit = useCallback((commandName: string): void => {
    setEditContent('');
    setEditLoading(false);
    setEditRequest({ commandName });
    setEditModalOpen(true);
  }, []);

  const handleEditCancel = useCallback((): void => {
    setEditModalOpen(false);
    setEditRequest(null);
    setEditLoading(false);
    setEditContent('');
  }, []);

  // 防抖保存，避免频繁写入
  const debouncedSave = useMemo(
    () => debounce((content: string) => {
      if (!editRequest) return;
      void (async () => {
        const commandName = editRequest.commandName;
        const filePath = await getCentralCommandPath(commandName);
        const writeResult = await window.electronAPI.writeFile(filePath, content);
        if (!writeResult.success) {
          toast.error(t('commandsSync.saveFailed', { error: writeResult.error ?? t('common.unknownError') }));
          return;
        }

        const syncResults: Array<{ success: boolean; error?: string }> = await Promise.all(
          commandTools.map(async (tool) => {
            const targetRoot = await expandPath(tool.commandsPath);
            const targetPath = joinPath(targetRoot, commandName);
            const existsResult = await window.electronAPI.pathExists(targetPath);
            if (!existsResult.success || !existsResult.exists) {
              return { success: true as const };
            }
            return window.electronAPI.copyFile(filePath, targetPath);
          }),
        );

        const failed = syncResults.find((result) => !result.success);
        if (failed) {
          toast.error(t('commandsSync.syncToToolsFailed', { error: failed.error ?? t('common.unknownError') }));
        }
      })();
    }, 1000),
    [commandTools, editRequest, getCentralCommandPath, t],
  );

  const handleContentChange = useCallback((value: string | undefined) => {
    const newContent = value ?? '';
    setEditContent(newContent);
    debouncedSave(newContent);
  }, [debouncedSave]);

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  /** 处理文件选择 */
  const handleFilesAdded = useCallback((files: File[]): void => {
    setUploadedFiles((prev) => {
      const next = [...prev];
      const keys = new Set(prev.map((item) => `${item.file.name}-${item.file.size}-${item.file.lastModified}`));

      for (const file of files) {
        const lowerName = file.name.toLowerCase();
        const isAccepted = ACCEPTED_COMMAND_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
        if (!isAccepted) continue;

        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (keys.has(key)) continue;

        keys.add(key);
        next.push({ name: file.name, file });
      }

      return next;
    });
  }, []);

  /** 处理添加 Command */
  const handleAddCommands = useCallback(async (): Promise<void> => {
    if (uploadedFiles.length === 0) return;

    setAddLoading(true);

    try {
      const centralRoot = await expandPath(CENTRAL_COMMANDS_PATH);
      await window.electronAPI.ensureDir(centralRoot);

      for (const uploadedFile of uploadedFiles) {
        // 获取文件名（去掉 .md 扩展名）
        const commandName = uploadedFile.name.replace(/\.md$/i, '');

        // 读取文件内容
        const content = await uploadedFile.file.text();

        // 写入中心化目录
        const centralCommandPath = joinPath(centralRoot, `${commandName}.md`);
        const writeResult = await window.electronAPI.writeFile(centralCommandPath, content);
        if (!writeResult.success) {
          throw new Error(writeResult.error ?? t('commandsSync.centralWriteFailed'));
        }

        // 复制到每个工具目录
        for (const tool of commandTools) {
          if (!tool.commandsPath) continue;

          const targetRoot = await expandPath(tool.commandsPath);
          const targetPath = joinPath(targetRoot, `${commandName}.md`);
          const copyResult = await window.electronAPI.copyFile(centralCommandPath, targetPath);
          if (!copyResult.success) {
            throw new Error(copyResult.error ?? t('commandsSync.copyToToolFailed', { toolName: tool.name }));
          }
        }
      }

      toast.success(t('commandsSync.addSuccess', { count: uploadedFiles.length }));
      setAddModalOpen(false);
      setUploadedFiles([]);

      // 刷新命令列表
      await loadAllCommands();
    } catch (error) {
      toast.error(t('commandsSync.addFailed', { error: error instanceof Error ? error.message : t('common.unknownError') }));
    } finally {
      setAddLoading(false);
    }
  }, [uploadedFiles, commandTools, loadAllCommands, t]);

  /** 关闭添加 Modal 时重置状态 */
  const handleAddModalClose = useCallback((): void => {
    setAddModalOpen(false);
    setUploadedFiles([]);
  }, []);

  useEffect(() => {
    if (!editModalOpen || !editRequest) return;

    let cancelled = false;

    const loadContent = async (): Promise<void> => {
      setEditLoading(true);

      const sourceTools = getAllSourceTools(editRequest.commandName);
      const filePath = await ensureCentralCommandFile(editRequest.commandName, sourceTools);
      if (!filePath) {
        if (!cancelled) {
          setEditContent('');
          toast.error(t('commandsSync.readNoEditable'));
          setEditLoading(false);
        }
        return;
      }

      const result = await window.electronAPI.readFile(filePath);
      if (cancelled) return;

      if (!result.success) {
        setEditContent('');
        toast.error(t('commandsSync.readFailed', { error: result.error ?? t('common.unknownError') }));
      } else {
        setEditContent(result.content ?? '');
      }

      setEditLoading(false);
    };

    void loadContent();

    return () => {
      cancelled = true;
    };
  }, [editModalOpen, editRequest, ensureCentralCommandFile, getAllSourceTools, t]);

  useEffect(() => {
    if (toolsLoading) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void loadAllCommands();
    });
    return () => {
      cancelled = true;
    };
  }, [loadAllCommands, toolsLoading]);

  const isLoading = toolsLoading || loading;

  let content: JSX.Element;

  if (isLoading && commands.length === 0) {
    content = <Spinner tip={t('common.loading')} />;
  } else if (commandTools.length === 0) {
    content = <EmptyState description={t('commandsSync.emptyUnsupportedTools')} />;
  } else if (commands.length === 0) {
    content = <EmptyState description={t('commandsSync.emptyNoCommands')} />;
  } else {
    content = (
      <div className="grid grid-cols-3 gap-4">
        {commands.map((command) => (
          <CommandCard
            key={command.name}
            command={command}
            tools={commandTools}
            onToggleTool={handleToggleTool}
            onEditCommand={handleOpenEdit}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">{t('commandsSync.title')}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void handleOpenFolder()}>
            <Icon icon="mdi:folder-outline" width={16} height={16} />
            {t('commandsSync.openFolder')}
          </Button>
          <Button onClick={() => setAddModalOpen(true)}>
            <Icon icon="mdi:plus" width={16} height={16} />
            {t('commandsSync.addCommand')}
          </Button>
          <Button variant="outline" onClick={() => void loadAllCommands()} disabled={isLoading}>
            <Icon icon="mdi:refresh" width={16} height={16} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {content}

      {/* 编辑 Command 对话框 */}
      <Dialog open={editModalOpen} onOpenChange={(open) => { if (!open) handleEditCancel(); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editRequest
                ? t('commandsSync.editModalTitle', { commandName: editRequest.commandName })
                : t('commandsSync.editModalTitleDefault')}
            </DialogTitle>
          </DialogHeader>
          {editRequest ? (
            <div className="space-y-3">
              {editLoading ? (
                <Spinner />
              ) : (
                <CodeEditor
                  height={COMMAND_EDITOR_HEIGHT}
                  language="markdown"
                  value={editContent}
                  onChange={handleContentChange}
                />
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 添加 Command 对话框 */}
      <Dialog open={addModalOpen} onOpenChange={(open) => { if (!open) handleAddModalClose(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('commandsSync.addModalTitle')}</DialogTitle>
          </DialogHeader>

          <FileUpload
            accept={ACCEPTED_COMMAND_EXTENSIONS.join(',')}
            multiple
            onFilesSelected={handleFilesAdded}
          >
            <Icon icon="mdi:inbox-arrow-down" className="text-muted-foreground/50" width={40} height={40} />
            <p className="text-sm text-muted-foreground">{t('commandsSync.dragAreaMessage')}</p>
          </FileUpload>

          {uploadedFiles.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">{t('commandsSync.selectedFiles', { count: uploadedFiles.length })}</h4>
              <ul className="space-y-1">
                {uploadedFiles.map((file) => (
                  <li key={file.name} className="flex items-center gap-2 text-sm">
                    <Icon icon="mdi:file-outline" width={16} height={16} />
                    <span>{file.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={handleAddModalClose}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={uploadedFiles.length === 0 || addLoading}
              onClick={() => void handleAddCommands()}
            >
              {addLoading && <Icon icon="svg-spinners:ring-resize" width={16} height={16} />}
              {t('commandsSync.confirmAdd')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!confirmDialog} onOpenChange={(open) => { if (!open) setConfirmDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('commandsSync.confirmRemoveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('commandsSync.confirmRemoveContent', {
                targetName: confirmDialog?.targetName,
                commandName: confirmDialog?.commandName,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmRemove()}>
              {t('common.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const MemoizedCommandsSync = memo(CommandsSync);

export default MemoizedCommandsSync;

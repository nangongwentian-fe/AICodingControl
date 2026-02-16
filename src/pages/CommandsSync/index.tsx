import type { AiToolId } from '@/types/ai-tools';
import type { CommandItem, CommandTool, CommandToolStatus, EditRequest, UploadedFile } from './types';
import { Button, Empty, message, Modal, Spin, Upload } from 'antd';
import type { RcFile } from 'antd/es/upload';
import debounce from 'lodash/debounce';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ReloadOutlined, FolderOutlined, PlusOutlined, FileOutlined, InboxOutlined } from '@ant-design/icons';
import filter from 'lodash/filter';
import sortBy from 'lodash/sortBy';
import CodeEditor from '@/components/CodeEditor';
import { useAiTools } from '@/hooks/useAiTools';
import { expandPath, joinPath } from '@/utils/path';
import CommandCard from './CommandCard';
import {
  ACCEPTED_COMMAND_EXTENSIONS,
  CENTRAL_COMMANDS_PATH,
  COMMAND_EDITOR_HEIGHT,
  COMMAND_FILE_EXTENSION,
  DRAG_AREA_MESSAGE,
} from './const';

function CommandsSync(): JSX.Element {
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
        message.error('部分 Commands 读取失败');
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
  }, [commandTools, createEmptyToolStatus, filterCommandFiles]);

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
      message.error('未找到对应的工具配置');
      return false;
    }

    const sources = getSourceTools(commandName, targetToolId);
    const centralCommandPath = await ensureCentralCommandFile(commandName, sources);
    if (!centralCommandPath) {
      message.error('未找到可同步的来源');
      return false;
    }

    const targetRoot = await expandPath(targetTool.commandsPath);
    const targetPath = joinPath(targetRoot, commandName);
    const result = await window.electronAPI.copyFile(centralCommandPath, targetPath);
    if (!result.success) {
      message.error(`复制到目标工具失败: ${result.error ?? '未知错误'}`);
      return false;
    }

    return true;
  }, [commandTools, ensureCentralCommandFile, getSourceTools]);

  const removeCommandFromTool = useCallback(async (commandName: string, toolId: AiToolId): Promise<boolean> => {
    const tool = commandTools.find((item) => item.id === toolId);
    if (!tool) {
      message.error('未找到对应的工具配置');
      return false;
    }

    const targetRoot = await expandPath(tool.commandsPath);
    const targetPath = joinPath(targetRoot, commandName);
    const result = await window.electronAPI.removeFile(targetPath);

    if (!result.success) {
      message.error(`移除失败: ${result.error ?? '未知错误'}`);
      return false;
    }

    return true;
  }, [commandTools]);

  const handleEnableCommand = useCallback(async (commandName: string, toolId: AiToolId): Promise<void> => {
    const targetToolName = commandTools.find((tool) => tool.id === toolId)?.name ?? '目标工具';

    updateCommandStatus(commandName, toolId, true);
    const ok = await enableCommandForTool(commandName, toolId);
    if (ok) {
      message.success(`已同步到 ${targetToolName}`);
    } else {
      updateCommandStatus(commandName, toolId, false);
    }
  }, [commandTools, enableCommandForTool, updateCommandStatus]);

  const handleDisableCommand = useCallback((commandName: string, toolId: AiToolId): void => {
    const targetTool = commandTools.find((tool) => tool.id === toolId);
    const targetName = targetTool?.name ?? '目标工具';

    Modal.confirm({
      title: '确认移除',
      content: `确定要从 ${targetName} 移除 ${commandName} 吗？`,
      okText: '移除',
      cancelText: '取消',
      onOk: async () => {
        const allSources = getAllSourceTools(commandName);
        const centralCommandPath = await ensureCentralCommandFile(commandName, allSources);
        if (!centralCommandPath) {
          message.error('移除前未找到可备份的 command 文件，已取消操作');
          return;
        }

        const ok = await removeCommandFromTool(commandName, toolId);
        if (ok) {
          updateCommandStatus(commandName, toolId, false);
          await loadAllCommands();
          message.success(`已从 ${targetName} 移除`);
        }
      },
    });
  }, [
    commandTools,
    ensureCentralCommandFile,
    getAllSourceTools,
    loadAllCommands,
    removeCommandFromTool,
    updateCommandStatus,
  ]);

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
          message.error(`保存失败: ${writeResult.error ?? '未知错误'}`);
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
          message.error(`同步到工具目录失败: ${failed.error ?? '未知错误'}`);
        }
      })();
    }, 1000),
    [commandTools, editRequest, getCentralCommandPath],
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
          throw new Error(writeResult.error ?? '中心目录写入失败');
        }

        // 复制到每个工具目录
        for (const tool of commandTools) {
          if (!tool.commandsPath) continue;

          const targetRoot = await expandPath(tool.commandsPath);
          const targetPath = joinPath(targetRoot, `${commandName}.md`);
          const copyResult = await window.electronAPI.copyFile(centralCommandPath, targetPath);
          if (!copyResult.success) {
            throw new Error(copyResult.error ?? `复制到 ${tool.name} 失败`);
          }
        }
      }

      message.success(`成功添加 ${uploadedFiles.length} 个 Command`);
      setAddModalOpen(false);
      setUploadedFiles([]);

      // 刷新命令列表
      await loadAllCommands();
    } catch (error) {
      message.error(`添加失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setAddLoading(false);
    }
  }, [uploadedFiles, commandTools, loadAllCommands]);

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
          message.error('读取失败: 未找到可编辑的 command 文件');
          setEditLoading(false);
        }
        return;
      }

      const result = await window.electronAPI.readFile(filePath);
      if (cancelled) return;

      if (!result.success) {
        setEditContent('');
        message.error(`读取失败: ${result.error ?? '未知错误'}`);
      } else {
        setEditContent(result.content ?? '');
      }

      setEditLoading(false);
    };

    void loadContent();

    return () => {
      cancelled = true;
    };
  }, [editModalOpen, editRequest, ensureCentralCommandFile, getAllSourceTools]);

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
    content = (
      <div className="flex justify-center py-16">
        <Spin tip="加载中...">
          <div className="p-12" />
        </Spin>
      </div>
    );
  } else if (commandTools.length === 0) {
    content = <Empty description="暂无支持 Commands 的工具" />;
  } else if (commands.length === 0) {
    content = <Empty description="暂无 Commands" />;
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
        <h2 className="text-lg font-medium">Commands 列表</h2>
        <div className="flex gap-2">
          <Button icon={<FolderOutlined />} onClick={() => void handleOpenFolder()}>
            打开 Commands 文件夹
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
            添加 Command
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => void loadAllCommands()} loading={isLoading}>
            刷新
          </Button>
        </div>
      </div>

      {content}

      <Modal
        title={editRequest ? `编辑 ${editRequest.commandName}` : '编辑 Command'}
        open={editModalOpen}
        onCancel={handleEditCancel}
        footer={null}
        width={960}
        destroyOnHidden
      >
        {editRequest ? (
          <div className="space-y-3">
            {editLoading ? (
              <div className="flex justify-center py-12">
                <Spin>
                  <div className="p-12" />
                </Spin>
              </div>
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
      </Modal>

      <Modal
        title="添加 Command"
        open={addModalOpen}
        onCancel={handleAddModalClose}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Upload
          accept={ACCEPTED_COMMAND_EXTENSIONS.join(',')}
          multiple
          showUploadList={false}
          beforeUpload={(file) => {
            handleFilesAdded([file as RcFile]);
            // 阻止实际上传
            return false;
          }}
        >
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors">
            <InboxOutlined className="text-4xl text-gray-400 mb-2" />
            <p className="text-gray-600">{DRAG_AREA_MESSAGE}</p>
          </div>
        </Upload>

        {uploadedFiles.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">已选择 {uploadedFiles.length} 个文件：</h4>
            <ul className="space-y-1">
              {uploadedFiles.map((file) => (
                <li key={file.name} className="flex items-center gap-2 text-sm">
                  <FileOutlined />
                  <span>{file.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={handleAddModalClose}>
            取消
          </Button>
          <Button
            type="primary"
            loading={addLoading}
            disabled={uploadedFiles.length === 0}
            onClick={() => void handleAddCommands()}
          >
            确认添加
          </Button>
        </div>
      </Modal>
    </div>
  );
}

const MemoizedCommandsSync = memo(CommandsSync);

export default MemoizedCommandsSync;

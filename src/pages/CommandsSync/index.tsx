import type { AiToolId } from '@/types/ai-tools';
import type { CommandItem, CommandTool, CommandToolStatus, EditRequest } from './types';
import { Button, Empty, message, Modal, Spin } from 'antd';
import debounce from 'lodash/debounce';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ReloadOutlined } from '@ant-design/icons';
import filter from 'lodash/filter';
import some from 'lodash/some';
import sortBy from 'lodash/sortBy';
import CodeEditor from '@/components/CodeEditor';
import { useAiTools } from '@/hooks/useAiTools';
import { expandPath, joinPath } from '@/utils/path';
import CommandCard from './CommandCard';
import { CENTRAL_COMMANDS_PATH, COMMAND_EDITOR_HEIGHT, COMMAND_FILE_EXTENSION } from './const';

function CommandsSync(): JSX.Element {
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editRequest, setEditRequest] = useState<EditRequest | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editContent, setEditContent] = useState('');

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

  /** 将工具目录中的真实 command 文件迁移到中心目录，并替换为软链接 */
  const migrateCommandIfNeeded = useCallback(async (
    commandName: string,
    toolCommandsPath: string,
    centralRoot: string,
  ): Promise<void> => {
    const commandPath = joinPath(toolCommandsPath, commandName);
    const symlinkResult = await window.electronAPI.checkSymlink(commandPath);
    if (symlinkResult.isSymlink) return;

    const centralCommandPath = joinPath(centralRoot, commandName);
    const centralExists = await window.electronAPI.pathExists(centralCommandPath);

    if (!centralExists.exists) {
      await window.electronAPI.moveDir(commandPath, centralCommandPath);
    } else {
      await window.electronAPI.removeDir(commandPath);
    }

    await window.electronAPI.createSymlink(centralCommandPath, commandPath, 'file');
  }, []);

  const loadAllCommands = useCallback(async (): Promise<void> => {
    if (commandTools.length === 0) {
      setCommands([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const centralRoot = await expandPath(CENTRAL_COMMANDS_PATH);
    await window.electronAPI.ensureDir(centralRoot);

    const settled = await Promise.allSettled(
      commandTools.map(async (tool) => {
        const commandsPath = await expandPath(tool.commandsPath);
        const dirResult = await window.electronAPI.readDirFiles(commandsPath);
        if (!dirResult.success || !dirResult.exists) {
          return { toolId: tool.id as AiToolId, commands: [] as string[] };
        }

        const entries = dirResult.entries ?? [];
        const filteredCommands = filterCommandFiles(entries);

        await Promise.all(
          filteredCommands.map((name) => migrateCommandIfNeeded(name, commandsPath, centralRoot)),
        );

        return { toolId: tool.id as AiToolId, commands: filteredCommands };
      }),
    );

    const fulfilled = settled
      .filter((item): item is PromiseFulfilledResult<{ toolId: AiToolId; commands: string[] }> => item.status === 'fulfilled')
      .map((item) => item.value);

    if (fulfilled.length !== settled.length) {
      message.error('部分 Commands 读取失败');
    }

    const commandMap = new Map<string, CommandItem>();

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
    setLoading(false);
  }, [commandTools, createEmptyToolStatus, filterCommandFiles, migrateCommandIfNeeded]);

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

      const filtered = updated.filter((command) => some(command.toolStatus));
      return sortBy(filtered, (command) => command.name.toLowerCase());
    });
  }, [createEmptyToolStatus]);

  const getSourceTools = useCallback((commandName: string, targetToolId: AiToolId): CommandTool[] => {
    const command = commands.find((c) => c.name === commandName);
    if (!command) return [];
    return commandTools.filter((tool) => tool.id !== targetToolId && command.toolStatus[tool.id as AiToolId]);
  }, [commandTools, commands]);

  const enableCommandForTool = useCallback(async (
    commandName: string,
    targetToolId: AiToolId,
  ): Promise<boolean> => {
    const targetTool = commandTools.find((tool) => tool.id === targetToolId);
    if (!targetTool) {
      message.error('未找到对应的工具配置');
      return false;
    }

    const centralRoot = await expandPath(CENTRAL_COMMANDS_PATH);
    const centralCommandPath = joinPath(centralRoot, commandName);

    const centralExists = await window.electronAPI.pathExists(centralCommandPath);
    if (!centralExists.exists) {
      const sources = getSourceTools(commandName, targetToolId);
      if (sources.length === 0) {
        message.error('未找到可同步的来源');
        return false;
      }
      const sourceRoot = await expandPath(sources[0].commandsPath);
      const sourcePath = joinPath(sourceRoot, commandName);
      const copyResult = await window.electronAPI.copyDir(sourcePath, centralCommandPath);
      if (!copyResult.success) {
        message.error(`复制到中心目录失败: ${copyResult.error ?? '未知错误'}`);
        return false;
      }
    }

    const targetRoot = await expandPath(targetTool.commandsPath);
    const targetPath = joinPath(targetRoot, commandName);
    const result = await window.electronAPI.createSymlink(centralCommandPath, targetPath, 'file');
    if (!result.success) {
      message.error(`创建软链接失败: ${result.error ?? '未知错误'}`);
      return false;
    }

    return true;
  }, [commandTools, getSourceTools]);

  const removeCommandFromTool = useCallback(async (commandName: string, toolId: AiToolId): Promise<boolean> => {
    const tool = commandTools.find((item) => item.id === toolId);
    if (!tool) {
      message.error('未找到对应的工具配置');
      return false;
    }

    const targetRoot = await expandPath(tool.commandsPath);
    const targetPath = joinPath(targetRoot, commandName);
    const result = await window.electronAPI.removeDir(targetPath);

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
        const ok = await removeCommandFromTool(commandName, toolId);
        if (ok) {
          updateCommandStatus(commandName, toolId, false);
          message.success(`已从 ${targetName} 移除`);
        }
      },
    });
  }, [commandTools, removeCommandFromTool, updateCommandStatus]);

  const handleToggleTool = useCallback(async (commandName: string, toolId: AiToolId, enabled: boolean): Promise<void> => {
    if (enabled) {
      await handleEnableCommand(commandName, toolId);
      return;
    }

    handleDisableCommand(commandName, toolId);
  }, [handleDisableCommand, handleEnableCommand]);

  const getCentralCommandPath = useCallback(async (commandName: string): Promise<string> => {
    const centralRoot = await expandPath(CENTRAL_COMMANDS_PATH);
    return joinPath(centralRoot, commandName);
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
      const filePath = getCentralCommandPath(editRequest.commandName);
      window.electronAPI.writeFile(filePath, content);
    }, 1000),
    [editRequest, getCentralCommandPath],
  );

  const handleContentChange = useCallback((value: string | undefined) => {
    const newContent = value ?? '';
    setEditContent(newContent);
    debouncedSave(newContent);
  }, [debouncedSave]);

  useEffect(() => {
    if (!editModalOpen || !editRequest) return;

    let cancelled = false;

    const loadContent = async (): Promise<void> => {
      setEditLoading(true);

      const filePath = await getCentralCommandPath(editRequest.commandName);
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
  }, [editModalOpen, editRequest, getCentralCommandPath]);

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
    </div>
  );
}

const MemoizedCommandsSync = memo(CommandsSync);

export default MemoizedCommandsSync;
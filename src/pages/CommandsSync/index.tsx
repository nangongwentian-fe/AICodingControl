import type { AiToolId } from '@/types/ai-tools';
import type { CommandItem, CommandTool, CommandToolStatus, EditRequest, SyncRequest } from './types';
import { Button, Empty, message, Modal, Select, Spin } from 'antd';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ReloadOutlined } from '@ant-design/icons';
import filter from 'lodash/filter';
import keyBy from 'lodash/keyBy';
import some from 'lodash/some';
import sortBy from 'lodash/sortBy';
import CodeEditor from '@/components/CodeEditor';
import { useAiTools } from '@/hooks/useAiTools';
import { expandPath, joinPath } from '@/utils/path';
import CommandCard from './CommandCard';
import { COMMAND_EDITOR_HEIGHT, COMMAND_FILE_EXTENSION } from './const';

function CommandsSync(): JSX.Element {
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncRequest, setSyncRequest] = useState<SyncRequest | null>(null);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncSourceToolId, setSyncSourceToolId] = useState<AiToolId | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [editRequest, setEditRequest] = useState<EditRequest | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
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

  const commandsByName = useMemo(() => keyBy(commands, (command) => command.name), [commands]);

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

      const filtered = updated.filter((command) => some(command.toolStatus));
      return sortBy(filtered, (command) => command.name.toLowerCase());
    });
  }, [createEmptyToolStatus]);

  const getSourceTools = useCallback((commandName: string, targetToolId: AiToolId): CommandTool[] => {
    const command = commandsByName[commandName];
    if (!command) return [];
    return commandTools.filter((tool) => tool.id !== targetToolId && command.toolStatus[tool.id as AiToolId]);
  }, [commandTools, commandsByName]);

  const getEnabledTools = useCallback((commandName: string): CommandTool[] => {
    const command = commandsByName[commandName];
    if (!command) return [];
    return commandTools.filter((tool) => command.toolStatus[tool.id as AiToolId]);
  }, [commandTools, commandsByName]);

  const getCommandFilePath = useCallback(async (commandName: string, toolId: AiToolId): Promise<string | null> => {
    const tool = commandTools.find((item) => item.id === toolId);
    if (!tool) return null;
    const commandRoot = await expandPath(tool.commandsPath);
    return joinPath(commandRoot, commandName);
  }, [commandTools]);

  const syncCommandBetweenTools = useCallback(async (
    commandName: string,
    sourceToolId: AiToolId,
    targetToolId: AiToolId,
  ): Promise<boolean> => {
    const sourceTool = commandTools.find((tool) => tool.id === sourceToolId);
    const targetTool = commandTools.find((tool) => tool.id === targetToolId);

    if (!sourceTool || !targetTool) {
      message.error('未找到对应的工具配置');
      return false;
    }

    const sourceRoot = await expandPath(sourceTool.commandsPath);
    const targetRoot = await expandPath(targetTool.commandsPath);
    const sourcePath = joinPath(sourceRoot, commandName);
    const targetPath = joinPath(targetRoot, commandName);

    const sourceExists = await window.electronAPI.pathExists(sourcePath);
    if (!sourceExists.success || !sourceExists.exists) {
      message.error('源 Command 不存在');
      return false;
    }

    const result = await window.electronAPI.copyDir(sourcePath, targetPath);
    if (!result.success) {
      message.error(`同步失败: ${result.error ?? '未知错误'}`);
      return false;
    }

    return true;
  }, [commandTools]);

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
    const sources = getSourceTools(commandName, toolId);
    const targetToolName = commandTools.find((tool) => tool.id === toolId)?.name ?? '目标工具';

    if (sources.length === 0) {
      message.error('未找到可同步的来源');
      return;
    }

    if (sources.length === 1) {
      updateCommandStatus(commandName, toolId, true);
      const ok = await syncCommandBetweenTools(commandName, sources[0].id as AiToolId, toolId);
      if (ok) {
        message.success(`已同步到 ${targetToolName}`);
      } else {
        updateCommandStatus(commandName, toolId, false);
      }
      return;
    }

    setSyncRequest({ commandName, targetToolId: toolId });
    setSyncSourceToolId(sources[0].id as AiToolId);
    setSyncModalOpen(true);
  }, [commandTools, getSourceTools, syncCommandBetweenTools, updateCommandStatus]);

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

  const handleSyncConfirm = useCallback(async (): Promise<void> => {
    if (!syncRequest || !syncSourceToolId) return;

    setSyncing(true);
    updateCommandStatus(syncRequest.commandName, syncRequest.targetToolId, true);

    const ok = await syncCommandBetweenTools(
      syncRequest.commandName,
      syncSourceToolId,
      syncRequest.targetToolId,
    );

    if (ok) {
      message.success('同步成功');
    } else {
      updateCommandStatus(syncRequest.commandName, syncRequest.targetToolId, false);
    }

    setSyncing(false);
    setSyncModalOpen(false);
    setSyncRequest(null);
    setSyncSourceToolId(null);
  }, [syncRequest, syncSourceToolId, syncCommandBetweenTools, updateCommandStatus]);

  const handleSyncCancel = useCallback((): void => {
    setSyncModalOpen(false);
    setSyncRequest(null);
    setSyncSourceToolId(null);
  }, []);

  const handleOpenEdit = useCallback((commandName: string): void => {
    const enabledTools = getEnabledTools(commandName);
    if (enabledTools.length === 0) {
      message.error('未找到可编辑的 Command 文件');
      return;
    }

    setEditContent('');
    setEditLoading(false);
    setEditSaving(false);
    setEditRequest({
      commandName,
      toolId: enabledTools[0].id as AiToolId,
    });
    setEditModalOpen(true);
  }, [getEnabledTools]);

  const handleEditCancel = useCallback((): void => {
    setEditModalOpen(false);
    setEditRequest(null);
    setEditLoading(false);
    setEditSaving(false);
    setEditContent('');
  }, []);

  const handleEditToolChange = useCallback((toolId: AiToolId): void => {
    setEditRequest((prev) => (prev ? { ...prev, toolId } : prev));
  }, []);

  const handleSaveEditedCommand = useCallback(async (): Promise<void> => {
    if (!editRequest) return;

    const filePath = await getCommandFilePath(editRequest.commandName, editRequest.toolId);
    if (!filePath) {
      message.error('未找到对应的 Command 文件');
      return;
    }

    setEditSaving(true);
    const result = await window.electronAPI.writeFile(filePath, editContent);
    setEditSaving(false);

    if (!result.success) {
      message.error(`保存失败: ${result.error ?? '未知错误'}`);
      return;
    }

    message.success('保存成功');
  }, [editContent, editRequest, getCommandFilePath]);

  const sourceOptions = useMemo(() => {
    if (!syncRequest) return [];
    const sources = getSourceTools(syncRequest.commandName, syncRequest.targetToolId);
    return sources.map((tool) => ({ label: tool.name, value: tool.id }));
  }, [getSourceTools, syncRequest]);

  const editToolOptions = useMemo(() => {
    if (!editRequest) return [];
    const enabledTools = getEnabledTools(editRequest.commandName);
    return enabledTools.map((tool) => ({ label: tool.name, value: tool.id as AiToolId }));
  }, [editRequest, getEnabledTools]);

  useEffect(() => {
    if (!editModalOpen || !editRequest) return;

    let cancelled = false;

    const loadContent = async (): Promise<void> => {
      setEditLoading(true);

      const filePath = await getCommandFilePath(editRequest.commandName, editRequest.toolId);
      if (!filePath) {
        if (!cancelled) {
          setEditLoading(false);
          setEditContent('');
          message.error('未找到对应的 Command 文件');
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
  }, [editModalOpen, editRequest, getCommandFilePath]);

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
        title="选择同步来源"
        open={syncModalOpen}
        onOk={() => void handleSyncConfirm()}
        onCancel={handleSyncCancel}
        okText="同步"
        cancelText="取消"
        confirmLoading={syncing}
      >
        {syncRequest ? (
          <div className="space-y-3">
            <div>
              将 <span className="font-medium">{syncRequest.commandName}</span> 同步到
              <span className="ml-1 font-medium">
                {commandTools.find((tool) => tool.id === syncRequest.targetToolId)?.name ?? '目标工具'}
              </span>
            </div>
            <Select
              className="w-full"
              placeholder="选择来源工具"
              options={sourceOptions}
              value={syncSourceToolId ?? undefined}
              onChange={(value) => setSyncSourceToolId(value as AiToolId)}
            />
          </div>
        ) : null}
      </Modal>

      <Modal
        title={editRequest ? `编辑 ${editRequest.commandName}` : '编辑 Command'}
        open={editModalOpen}
        onOk={() => void handleSaveEditedCommand()}
        onCancel={handleEditCancel}
        okText="保存"
        cancelText="取消"
        confirmLoading={editSaving}
        okButtonProps={{ disabled: editLoading || !editRequest }}
        width={960}
        destroyOnHidden
      >
        {editRequest ? (
          <div className="space-y-3">
            {editToolOptions.length > 1 ? (
              <Select
                className="w-full"
                placeholder="选择要编辑的工具"
                options={editToolOptions}
                value={editRequest.toolId}
                onChange={(value) => handleEditToolChange(value as AiToolId)}
              />
            ) : null}

            {editLoading ? (
              <div className="flex justify-center py-12">
                <Spin tip="正在加载 Command 内容..." />
              </div>
            ) : (
              <CodeEditor
                height={COMMAND_EDITOR_HEIGHT}
                language="markdown"
                value={editContent}
                onChange={(value) => setEditContent(value ?? '')}
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

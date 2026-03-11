import type { AiTool, McpServer, McpServerConfig, McpServerWithStatus, McpToolStatus } from './types';
import type { AiToolWithLogo } from '@/hooks/useAiTools';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as TOML from 'smol-toml';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { useAiTools } from '@/hooks/useAiTools';
import { expandPath } from '@/utils/path';
import { exportToToolFormat, importFromToolFormat, isValidMcpConfigRecord } from './adapters';
import McpServerCard from './McpServerCard';
import McpServerModal from './McpServerModal';

const MCP_FILE = 'mcp.json';

const McpSync = memo(() => {
  const { t } = useTranslation();
  const [mcpServers, setMcpServers] = useState<McpServerWithStatus[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerWithStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const filePathRef = useRef('');

  const { mcpTools, loading: toolsLoading } = useAiTools();

  const createEmptyToolStatus = useCallback((): McpToolStatus => {
    return mcpTools.reduce((acc, tool) => {
      acc[tool.id as AiTool] = false;
      return acc;
    }, {} as McpToolStatus);
  }, [mcpTools]);

  const saveMcpServers = useCallback(async (servers: McpServerWithStatus[]) => {
    if (!filePathRef.current) return;
    const data: McpServer[] = servers.map(({ name, config }) => ({ name, config }));
    await window.electronAPI.writeFile(filePathRef.current, JSON.stringify(data, null, 2));
  }, []);

  const readToolConfig = useCallback(async (tool: AiToolWithLogo): Promise<McpServer[]> => {
    if (!tool.mcpConfigPath || !tool.mcpConfigKey || !tool.mcpFormat) return [];

    try {
      const configPath = await expandPath(tool.mcpConfigPath);
      const result = await window.electronAPI.readFile(configPath);
      if (!result.success || !result.content) return [];

      let fileConfig: Record<string, unknown>;
      if (tool.mcpFormat === 'toml') {
        fileConfig = TOML.parse(result.content) as Record<string, unknown>;
      } else {
        fileConfig = JSON.parse(result.content);
      }

      const mcpConfig = fileConfig[tool.mcpConfigKey];
      if (!isValidMcpConfigRecord(mcpConfig)) return [];

      return importFromToolFormat(mcpConfig as Record<string, never>, tool.id as AiTool);
    } catch {
      return [];
    }
  }, []);

  const loadAllMcpServers = useCallback(async () => {
    if (mcpTools.length === 0) return;

    setLoading(true);

    const results = await Promise.all(
      mcpTools.map(async (tool) => {
        const servers = await readToolConfig(tool);
        return { toolId: tool.id, servers };
      }),
    );

    const serverMap = new Map<string, McpServerWithStatus>();

    for (const { toolId, servers } of results) {
      for (const server of servers) {
        const existing = serverMap.get(server.name);
        if (existing) {
          existing.toolStatus[toolId as AiTool] = true;
        } else {
          const toolStatus = createEmptyToolStatus();
          toolStatus[toolId as AiTool] = true;
          serverMap.set(server.name, {
            ...server,
            toolStatus,
          });
        }
      }
    }

    const mergedServers = Array.from(serverMap.values());
    setMcpServers(mergedServers);

    await saveMcpServers(mergedServers);

    setLoading(false);
  }, [mcpTools, readToolConfig, saveMcpServers, createEmptyToolStatus]);

  const writeToolConfig = useCallback(async (
    tool: AiToolWithLogo,
    servers: McpServer[],
  ) => {
    if (!tool.mcpConfigPath || !tool.mcpConfigKey || !tool.mcpFormat) return;

    const configPath = await expandPath(tool.mcpConfigPath);
    const { mcpFormat, mcpConfigKey } = tool;

    let existingConfig: Record<string, unknown> = {};
    const readResult = await window.electronAPI.readFile(configPath);
    if (readResult.success && readResult.content) {
      try {
        if (mcpFormat === 'toml') {
          existingConfig = TOML.parse(readResult.content) as Record<string, unknown>;
        } else {
          existingConfig = JSON.parse(readResult.content);
        }
      } catch {
        // 文件格式无效，使用空对象
      }
    }

    const exported = exportToToolFormat(servers, tool.id as AiTool);
    existingConfig[mcpConfigKey] = exported;

    let content: string;
    if (mcpFormat === 'toml') {
      content = TOML.stringify(existingConfig);
    } else {
      content = JSON.stringify(existingConfig, null, 2);
    }

    await window.electronAPI.writeFile(configPath, content);
  }, []);

  const handleToggleTool = useCallback(async (
    serverName: string,
    toolId: string,
    enabled: boolean,
  ) => {
    const tool = mcpTools.find(t => t.id === toolId);
    if (!tool) return;

    try {
      setMcpServers((prev) => {
        const newServers = prev.map((s) => {
          if (s.name === serverName) {
            return {
              ...s,
              toolStatus: { ...s.toolStatus, [toolId]: enabled },
            };
          }
          return s;
        });
        return newServers;
      });

      const currentServers = mcpServers.map((s) => {
        if (s.name === serverName) {
          return { ...s, toolStatus: { ...s.toolStatus, [toolId]: enabled } };
        }
        return s;
      });

      const serversForTool = currentServers
        .filter(s => s.toolStatus[toolId as AiTool])
        .map(({ name, config }) => ({ name, config }));

      await writeToolConfig(tool, serversForTool);

      toast.success(
        enabled
          ? t('mcpSync.addedTo', { toolName: tool.name })
          : t('mcpSync.removedFrom', { toolName: tool.name }),
      );
    } catch (error) {
      toast.error(t('mcpSync.actionFailed', { error: error instanceof Error ? error.message : t('common.unknownError') }));
      setMcpServers((prev) => {
        return prev.map((s) => {
          if (s.name === serverName) {
            return {
              ...s,
              toolStatus: { ...s.toolStatus, [toolId]: !enabled },
            };
          }
          return s;
        });
      });
    }
  }, [mcpServers, mcpTools, t, writeToolConfig]);

  const loadAllMcpServersRef = useRef(loadAllMcpServers);

  useEffect(() => {
    loadAllMcpServersRef.current = loadAllMcpServers;
  }, [loadAllMcpServers]);

  useEffect(() => {
    if (toolsLoading || mcpTools.length === 0) return;

    const init = async () => {
      const dataDir = await window.electronAPI.getDataDir();
      filePathRef.current = `${dataDir}/${MCP_FILE}`;
      await loadAllMcpServersRef.current();
    };
    void init();
  }, [toolsLoading, mcpTools.length]);

  const handleAdd = () => {
    setEditingServer(null);
    setModalOpen(true);
  };

  const handleEdit = (server: McpServerWithStatus) => {
    setEditingServer(server);
    setModalOpen(true);
  };

  const handleDelete = async (serverName: string) => {
    const server = mcpServers.find(s => s.name === serverName);
    if (!server) return;

    try {
      const toolsToUpdate = mcpTools.filter(t => server.toolStatus[t.id as AiTool]);

      await Promise.all(
        toolsToUpdate.map(async (tool) => {
          const serversForTool = mcpServers
            .filter(s => s.name !== serverName && s.toolStatus[tool.id as AiTool])
            .map(({ name, config }) => ({ name, config }));
          return writeToolConfig(tool, serversForTool);
        }),
      );

      setMcpServers((prev) => {
        const newServers = prev.filter(s => s.name !== serverName);
        void saveMcpServers(newServers);
        return newServers;
      });

      toast.success(t('mcpSync.deleteSuccess'));
    } catch (error) {
      toast.error(t('mcpSync.deleteFailed', { error: error instanceof Error ? error.message : t('common.unknownError') }));
    }
  };

  const handleModalOk = async (name: string, config: McpServerConfig) => {
    const newServer: McpServerWithStatus = {
      name,
      config,
      toolStatus: editingServer?.toolStatus ?? createEmptyToolStatus(),
    };

    if (editingServer) {
      const toolsToUpdate = mcpTools.filter(t => newServer.toolStatus[t.id as AiTool]);

      for (const tool of toolsToUpdate) {
        const serversForTool = mcpServers
          .map(s => (s.name === editingServer.name ? newServer : s))
          .filter(s => s.toolStatus[tool.id as AiTool])
          .map(({ name: n, config: c }) => ({ name: n, config: c }));
        await writeToolConfig(tool, serversForTool);
      }

      setMcpServers((prev) => {
        const newServers = prev.map(s => (s.name === editingServer.name ? newServer : s));
        void saveMcpServers(newServers);
        return newServers;
      });
    } else {
      setMcpServers((prev) => {
        const newServers = [...prev, newServer];
        void saveMcpServers(newServers);
        return newServers;
      });
    }

    setModalOpen(false);
  };

  const isLoading = toolsLoading || loading;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">{t('mcpSync.title')}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadAllMcpServers()} disabled={isLoading}>
            <Icon icon="mdi:refresh" width={16} height={16} />
            {t('common.refresh')}
          </Button>
          <Button onClick={handleAdd}>
            <Icon icon="mdi:plus" width={16} height={16} />
            {t('mcpSync.addMcp')}
          </Button>
        </div>
      </div>

      {isLoading && mcpServers.length === 0 ? (
        <Spinner tip={t('common.loading')} />
      ) : mcpServers.length === 0 ? (
        <EmptyState description={t('mcpSync.empty')} />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {mcpServers.map(server => (
            <McpServerCard
              key={server.name}
              server={server}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleTool={handleToggleTool}
            />
          ))}
        </div>
      )}

      <McpServerModal
        open={modalOpen}
        editingServer={editingServer}
        onOk={(name, config) => void handleModalOk(name, config)}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
});

export default McpSync;

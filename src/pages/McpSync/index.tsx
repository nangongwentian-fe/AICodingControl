import type { AiTool, McpServer, McpServerConfig, McpServerWithStatus, McpToolStatus } from './types';
import type { AiToolWithLogo } from '@/hooks/useAiTools';
import { Button, Empty, message, Spin } from 'antd';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import * as TOML from 'smol-toml';
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

  // 使用 useAiTools hook 获取 mcpTools
  const { mcpTools, loading: toolsLoading } = useAiTools();

  // 创建空的工具状态（基于 mcpTools 动态生成）
  const createEmptyToolStatus = useCallback((): McpToolStatus => {
    return mcpTools.reduce((acc, tool) => {
      acc[tool.id as AiTool] = false;
      return acc;
    }, {} as McpToolStatus);
  }, [mcpTools]);



  // 保存 MCP 列表到本地文件
  const saveMcpServers = useCallback(async (servers: McpServerWithStatus[]) => {
    if (!filePathRef.current) return;
    // 只保存基本信息，不保存 toolStatus
    const data: McpServer[] = servers.map(({ name, config }) => ({ name, config }));
    await window.electronAPI.writeFile(filePathRef.current, JSON.stringify(data, null, 2));
  }, []);

  // 从单个工具读取 MCP 配置
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

  // 从所有工具读取并合并 MCP 配置
  const loadAllMcpServers = useCallback(async () => {
    if (mcpTools.length === 0) return;

    setLoading(true);

    // 并行读取所有工具的配置
    const results = await Promise.all(
      mcpTools.map(async (tool) => {
        const servers = await readToolConfig(tool);
        return { toolId: tool.id, servers };
      }),
    );

    // 合并去重：以 name 为 key
    const serverMap = new Map<string, McpServerWithStatus>();

    for (const { toolId, servers } of results) {
      for (const server of servers) {
        const existing = serverMap.get(server.name);
        if (existing) {
          // 已存在，更新工具状态
          existing.toolStatus[toolId as AiTool] = true;
        } else {
          // 新增
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

    // 持久化到本地 mcp.json
    await saveMcpServers(mergedServers);

    setLoading(false);
  }, [mcpTools, readToolConfig, saveMcpServers, createEmptyToolStatus]);

  // 写入单个工具的配置
  const writeToolConfig = useCallback(async (
    tool: AiToolWithLogo,
    servers: McpServer[],
  ) => {
    if (!tool.mcpConfigPath || !tool.mcpConfigKey || !tool.mcpFormat) return;

    const configPath = await expandPath(tool.mcpConfigPath);
    const { mcpFormat, mcpConfigKey } = tool;

    // 读取现有配置
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

    // 导出为工具格式
    const exported = exportToToolFormat(servers, tool.id as AiTool);
    existingConfig[mcpConfigKey] = exported;

    // 写入配置
    let content: string;
    if (mcpFormat === 'toml') {
      content = TOML.stringify(existingConfig);
    } else {
      content = JSON.stringify(existingConfig, null, 2);
    }

    await window.electronAPI.writeFile(configPath, content);
  }, []);

  // 切换某个 MCP 在某个工具中的配置状态
  const handleToggleTool = useCallback(async (
    serverName: string,
    toolId: string,
    enabled: boolean,
  ) => {
    const tool = mcpTools.find(t => t.id === toolId);
    if (!tool) return;

    try {
      // 更新本地状态
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

      // 获取该工具应该配置的所有 MCP
      const currentServers = mcpServers.map((s) => {
        if (s.name === serverName) {
          return { ...s, toolStatus: { ...s.toolStatus, [toolId]: enabled } };
        }
        return s;
      });

      const serversForTool = currentServers
        .filter(s => s.toolStatus[toolId as AiTool])
        .map(({ name, config }) => ({ name, config }));

      // 写入工具配置
      await writeToolConfig(tool, serversForTool);

      message.success(
        enabled
          ? t('mcpSync.addedTo', { toolName: tool.name })
          : t('mcpSync.removedFrom', { toolName: tool.name }),
      );
    } catch (error) {
      message.error(t('mcpSync.actionFailed', { error: error instanceof Error ? error.message : t('common.unknownError') }));
      // 回滚状态
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

  // 使用 ref 存储函数引用，避免 useEffect 依赖问题
  const loadAllMcpServersRef = useRef(loadAllMcpServers);

  // 保持 ref 最新
  useEffect(() => {
    loadAllMcpServersRef.current = loadAllMcpServers;
  }, [loadAllMcpServers]);

  // 当 mcpTools 加载完成后初始化
  useEffect(() => {
    if (toolsLoading || mcpTools.length === 0) return;

    const init = async () => {
      const dataDir = await window.electronAPI.getDataDir();
      filePathRef.current = `${dataDir}/${MCP_FILE}`;
      await loadAllMcpServersRef.current();
    };
    void init();
  }, [toolsLoading, mcpTools.length]);

  // 新增 MCP
  const handleAdd = () => {
    setEditingServer(null);
    setModalOpen(true);
  };

  // 编辑 MCP
  const handleEdit = (server: McpServerWithStatus) => {
    setEditingServer(server);
    setModalOpen(true);
  };

  // 删除 MCP
  const handleDelete = async (serverName: string) => {
    const server = mcpServers.find(s => s.name === serverName);
    if (!server) return;

    try {
      // 从所有已配置的工具中移除（并行执行）
      const toolsToUpdate = mcpTools.filter(t => server.toolStatus[t.id as AiTool]);

      await Promise.all(
        toolsToUpdate.map(async (tool) => {
          const serversForTool = mcpServers
            .filter(s => s.name !== serverName && s.toolStatus[tool.id as AiTool])
            .map(({ name, config }) => ({ name, config }));
          return writeToolConfig(tool, serversForTool);
        }),
      );

      // 更新本地状态
      setMcpServers((prev) => {
        const newServers = prev.filter(s => s.name !== serverName);
        void saveMcpServers(newServers);
        return newServers;
      });

      message.success(t('mcpSync.deleteSuccess'));
    } catch (error) {
      message.error(t('mcpSync.deleteFailed', { error: error instanceof Error ? error.message : t('common.unknownError') }));
    }
  };

  // 保存新增/编辑的 MCP
  const handleModalOk = async (name: string, config: McpServerConfig) => {
    const newServer: McpServerWithStatus = {
      name,
      config,
      toolStatus: editingServer?.toolStatus ?? createEmptyToolStatus(),
    };

    if (editingServer) {
      // 编辑模式：更新所有已配置的工具
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
      // 新增模式
      setMcpServers((prev) => {
        const newServers = [...prev, newServer];
        void saveMcpServers(newServers);
        return newServers;
      });
    }

    setModalOpen(false);
  };

  // 显示 loading 状态
  const isLoading = toolsLoading || loading;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">{t('mcpSync.title')}</h2>
        <div className="flex gap-2">
          <Button icon={<ReloadOutlined />} onClick={() => void loadAllMcpServers()} loading={isLoading}>
            {t('common.refresh')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('mcpSync.addMcp')}
          </Button>
        </div>
      </div>

      {isLoading && mcpServers.length === 0 ? (
        <div className="flex justify-center py-16">
          <Spin tip={t('common.loading')}>
            <div className="p-12" />
          </Spin>
        </div>
      ) : mcpServers.length === 0 ? (
        <Empty description={t('mcpSync.empty')} />
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

      {/* 新增/编辑 MCP 弹窗 */}
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

import type { AiTool, McpServer, McpServerWithStatus, McpStdioConfig, McpToolStatus } from './types';
import { Avatar, Button, Card, Empty, Form, Input, message, Modal, Popconfirm, Select, Spin, Switch } from 'antd';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import * as TOML from 'smol-toml';
import { COMMAND_OPTIONS, MCP_TOOLS, type McpToolConfig } from './const';
import { exportToToolFormat, importFromToolFormat, isStdioConfig, isValidMcpConfigRecord } from './adapters';

const MCP_FILE = 'mcp.json';

// 创建空的工具状态（基于 MCP_TOOLS 动态生成）
const createEmptyToolStatus = (): McpToolStatus => {
  return MCP_TOOLS.reduce((acc, tool) => {
    acc[tool.key] = false;
    return acc;
  }, {} as McpToolStatus);
};

const McpSync = memo(() => {
  const [mcpServers, setMcpServers] = useState<McpServerWithStatus[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerWithStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const filePathRef = useRef('');

  // 展开路径中的 ~
  const expandPath = useCallback(async (path: string): Promise<string> => {
    if (path.startsWith('~/')) {
      const homeDir = await window.electronAPI.getHomeDir();
      return path.replace('~', homeDir);
    }
    return path;
  }, []);

  // 保存 MCP 列表到本地文件
  const saveMcpServers = useCallback(async (servers: McpServerWithStatus[]) => {
    if (!filePathRef.current) return;
    // 只保存基本信息，不保存 toolStatus
    const data: McpServer[] = servers.map(({ name, config }) => ({ name, config }));
    await window.electronAPI.writeFile(filePathRef.current, JSON.stringify(data, null, 2));
  }, []);

  // 从单个工具读取 MCP 配置
  const readToolConfig = useCallback(async (toolKey: AiTool): Promise<McpServer[]> => {
    const toolConfig = MCP_TOOLS.find(t => t.key === toolKey);
    if (!toolConfig) return [];

    try {
      const configPath = await expandPath(toolConfig.configPath);
      const result = await window.electronAPI.readFile(configPath);
      if (!result.success || !result.content) return [];

      let fileConfig: Record<string, unknown>;
      if (toolConfig.format === 'toml') {
        fileConfig = TOML.parse(result.content) as Record<string, unknown>;
      } else {
        fileConfig = JSON.parse(result.content);
      }

      const mcpConfig = fileConfig[toolConfig.configKey];
      if (!isValidMcpConfigRecord(mcpConfig)) return [];

      return importFromToolFormat(mcpConfig as Record<string, never>, toolKey);
    } catch {
      return [];
    }
  }, [expandPath]);

  // 从所有工具读取并合并 MCP 配置
  const loadAllMcpServers = useCallback(async () => {
    setLoading(true);

    // 并行读取所有工具的配置
    const toolKeys = MCP_TOOLS.map(t => t.key);
    const results = await Promise.all(
      toolKeys.map(async (toolKey) => {
        const servers = await readToolConfig(toolKey);
        return { toolKey, servers };
      }),
    );

    // 合并去重：以 name 为 key
    const serverMap = new Map<string, McpServerWithStatus>();

    for (const { toolKey, servers } of results) {
      for (const server of servers) {
        const existing = serverMap.get(server.name);
        if (existing) {
          // 已存在，更新工具状态
          existing.toolStatus[toolKey] = true;
        } else {
          // 新增
          const toolStatus = createEmptyToolStatus();
          toolStatus[toolKey] = true;
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
  }, [readToolConfig, saveMcpServers]);

  // 写入单个工具的配置
  const writeToolConfig = useCallback(async (
    toolConfig: McpToolConfig,
    servers: McpServer[],
  ) => {
    const configPath = await expandPath(toolConfig.configPath);
    const { format, configKey } = toolConfig;

    // 读取现有配置
    let existingConfig: Record<string, unknown> = {};
    const readResult = await window.electronAPI.readFile(configPath);
    if (readResult.success && readResult.content) {
      try {
        if (format === 'toml') {
          existingConfig = TOML.parse(readResult.content) as Record<string, unknown>;
        } else {
          existingConfig = JSON.parse(readResult.content);
        }
      } catch {
        // 文件格式无效，使用空对象
      }
    }

    // 导出为工具格式
    const exported = exportToToolFormat(servers, toolConfig.key);
    existingConfig[configKey] = exported;

    // 写入配置
    let content: string;
    if (format === 'toml') {
      content = TOML.stringify(existingConfig);
    } else {
      content = JSON.stringify(existingConfig, null, 2);
    }

    await window.electronAPI.writeFile(configPath, content);
  }, [expandPath]);

  // 切换某个 MCP 在某个工具中的配置状态
  const handleToggleTool = useCallback(async (
    serverName: string,
    toolKey: AiTool,
    enabled: boolean,
  ) => {
    const toolConfig = MCP_TOOLS.find(t => t.key === toolKey);
    if (!toolConfig) return;

    try {
      // 更新本地状态
      setMcpServers((prev) => {
        const newServers = prev.map((s) => {
          if (s.name === serverName) {
            return {
              ...s,
              toolStatus: { ...s.toolStatus, [toolKey]: enabled },
            };
          }
          return s;
        });
        return newServers;
      });

      // 获取该工具应该配置的所有 MCP
      const currentServers = mcpServers.map((s) => {
        if (s.name === serverName) {
          return { ...s, toolStatus: { ...s.toolStatus, [toolKey]: enabled } };
        }
        return s;
      });

      const serversForTool = currentServers
        .filter(s => s.toolStatus[toolKey])
        .map(({ name, config }) => ({ name, config }));

      // 写入工具配置
      await writeToolConfig(toolConfig, serversForTool);

      message.success(enabled ? `已添加到 ${toolConfig.name}` : `已从 ${toolConfig.name} 移除`);
    } catch (error) {
      message.error(`操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
      // 回滚状态
      setMcpServers((prev) => {
        return prev.map((s) => {
          if (s.name === serverName) {
            return {
              ...s,
              toolStatus: { ...s.toolStatus, [toolKey]: !enabled },
            };
          }
          return s;
        });
      });
    }
  }, [mcpServers, writeToolConfig]);

  // 使用 ref 存储函数引用，避免 useEffect 依赖问题
  const loadAllMcpServersRef = useRef(loadAllMcpServers);

  // 保持 ref 最新
  useEffect(() => {
    loadAllMcpServersRef.current = loadAllMcpServers;
  }, [loadAllMcpServers]);

  // 初始化（只执行一次）
  useEffect(() => {
    const init = async () => {
      const dataDir = await window.electronAPI.getDataDir();
      filePathRef.current = `${dataDir}/${MCP_FILE}`;
      await loadAllMcpServersRef.current();
    };
    void init();
  }, []);

  // 新增 MCP
  const handleAdd = () => {
    setEditingServer(null);
    form.resetFields();
    setModalOpen(true);
  };

  // 编辑 MCP
  const handleEdit = (server: McpServerWithStatus) => {
    setEditingServer(server);
    if (isStdioConfig(server.config)) {
      form.setFieldsValue({
        name: server.name,
        command: server.config.command,
        args: server.config.args.join(' '),
      });
    }
    setModalOpen(true);
  };

  // 删除 MCP
  const handleDelete = async (serverName: string) => {
    const server = mcpServers.find(s => s.name === serverName);
    if (!server) return;

    try {
      // 从所有已配置的工具中移除（并行执行）
      const toolsToUpdate = MCP_TOOLS.filter(t => server.toolStatus[t.key]);

      await Promise.all(
        toolsToUpdate.map(async (toolConfig) => {
          const serversForTool = mcpServers
            .filter(s => s.name !== serverName && s.toolStatus[toolConfig.key])
            .map(({ name, config }) => ({ name, config }));
          return writeToolConfig(toolConfig, serversForTool);
        }),
      );

      // 更新本地状态
      setMcpServers((prev) => {
        const newServers = prev.filter(s => s.name !== serverName);
        void saveMcpServers(newServers);
        return newServers;
      });

      message.success('删除成功');
    } catch (error) {
      message.error(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 保存新增/编辑的 MCP
  const handleModalOk = async () => {
    const values = await form.validateFields();
    const config: McpStdioConfig = {
      type: 'stdio',
      command: values.command,
      args: values.args ? values.args.split(' ').filter(Boolean) : [],
    };
    const newServer: McpServerWithStatus = {
      name: values.name,
      config,
      toolStatus: editingServer?.toolStatus ?? createEmptyToolStatus(),
    };

    if (editingServer) {
      // 编辑模式：更新所有已配置的工具
      const toolsToUpdate = MCP_TOOLS.filter(t => newServer.toolStatus[t.key]);

      for (const toolConfig of toolsToUpdate) {
        const serversForTool = mcpServers
          .map(s => (s.name === editingServer.name ? newServer : s))
          .filter(s => s.toolStatus[toolConfig.key])
          .map(({ name, config: c }) => ({ name, config: c }));
        await writeToolConfig(toolConfig, serversForTool);
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

  return (
    <div className="h-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">MCP 列表</h2>
        <div className="flex gap-2">
          <Button icon={<ReloadOutlined />} onClick={() => void loadAllMcpServers()} loading={loading}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增 MCP
          </Button>
        </div>
      </div>

      {loading && mcpServers.length === 0 ? (
        <div className="flex justify-center py-16">
          <Spin tip="加载中...">
            <div className="p-12" />
          </Spin>
        </div>
      ) : mcpServers.length === 0 ? (
        <Empty description="暂无 MCP 配置" />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {mcpServers.map(server => (
            <Card
              key={server.name}
              title={server.name}
              hoverable
              extra={(
                <div className="flex gap-2">
                  <Button size="small" onClick={() => handleEdit(server)}>编辑</Button>
                  <Popconfirm
                    title="确认删除"
                    description={`确定要删除 ${server.name} 吗？将从所有工具中移除。`}
                    onConfirm={() => void handleDelete(server.name)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button size="small" danger>删除</Button>
                  </Popconfirm>
                </div>
              )}
            >
              <div className="flex flex-col">
                {MCP_TOOLS.map(tool => (
                  <div key={tool.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center gap-2">
                      {tool.logo && <Avatar src={tool.logo} size="small" shape="square" />}
                      <span>{tool.name}</span>
                    </div>
                    <Switch
                      size="small"
                      checked={server.toolStatus[tool.key]}
                      onChange={checked => void handleToggleTool(server.name, tool.key, checked)}
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 新增/编辑 MCP 弹窗 */}
      <Modal
        title={editingServer ? '编辑 MCP' : '新增 MCP'}
        open={modalOpen}
        onOk={() => void handleModalOk()}
        onCancel={() => setModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入 MCP 名称' }]}
          >
            <Input placeholder="例如：filesystem" disabled={!!editingServer} />
          </Form.Item>
          <Form.Item
            name="command"
            label="命令类型"
            rules={[{ required: true, message: '请选择命令类型' }]}
          >
            <Select options={COMMAND_OPTIONS} placeholder="选择命令类型" />
          </Form.Item>
          <Form.Item
            name="args"
            label="参数"
            rules={[{ required: true, message: '请输入参数' }]}
          >
            <Input placeholder="例如：-y @modelcontextprotocol/server-filesystem /path" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
});

export default McpSync;

import type { McpServerConfig, McpServerWithStatus } from './types';
import { Button, Form, Input, Modal, Radio, Select, Space } from 'antd';
import { memo, useEffect } from 'react';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { COMMAND_OPTIONS, CONFIG_TYPE_OPTIONS } from './const';
import { isHttpConfig, isStdioConfig } from './adapters';

export interface McpServerModalProps {
  open: boolean;
  editingServer: McpServerWithStatus | null;
  onOk: (name: string, config: McpServerConfig) => void;
  onCancel: () => void;
}

const McpServerModal = memo<McpServerModalProps>(({ open, editingServer, onOk, onCancel }) => {
  const [form] = Form.useForm();

  // 当 editingServer 变化时，设置表单值
  useEffect(() => {
    if (!open) return;

    if (editingServer) {
      if (isStdioConfig(editingServer.config)) {
        form.setFieldsValue({
          name: editingServer.name,
          configType: 'stdio',
          command: editingServer.config.command,
          args: editingServer.config.args.map(arg => ({ value: arg })),
          env: editingServer.config.env
            ? Object.entries(editingServer.config.env).map(([key, value]) => ({ key, value }))
            : [],
        });
      } else if (isHttpConfig(editingServer.config)) {
        form.setFieldsValue({
          name: editingServer.name,
          configType: 'http',
          url: editingServer.config.url,
          headers: editingServer.config.headers
            ? Object.entries(editingServer.config.headers).map(([key, value]) => ({ key, value }))
            : [],
        });
      }
    } else {
      form.resetFields();
      form.setFieldsValue({ configType: 'stdio' });
    }
  }, [open, editingServer, form]);

  const handleOk = async () => {
    const values = await form.validateFields();

    let config: McpServerConfig;
    if (values.configType === 'stdio') {
      const envEntries = values.env?.filter((item: { key: string; value: string }) => item.key && item.value) ?? [];
      config = {
        type: 'stdio',
        command: values.command,
        args: values.args?.map((item: { value: string }) => item.value).filter(Boolean) ?? [],
        env: envEntries.length > 0
          ? Object.fromEntries(envEntries.map((item: { key: string; value: string }) => [item.key, item.value]))
          : undefined,
      };
    } else {
      const headerEntries = values.headers?.filter((item: { key: string; value: string }) => item.key && item.value) ?? [];
      config = {
        type: 'http',
        url: values.url,
        headers: headerEntries.length > 0
          ? Object.fromEntries(headerEntries.map((item: { key: string; value: string }) => [item.key, item.value]))
          : undefined,
      };
    }

    onOk(values.name, config);
  };

  return (
    <Modal
      title={editingServer ? '编辑 MCP' : '新增 MCP'}
      open={open}
      onOk={() => void handleOk()}
      onCancel={onCancel}
      okText="确定"
      cancelText="取消"
      width={560}
    >
      <Form form={form} layout="vertical" initialValues={{ configType: 'stdio', args: [], env: [], headers: [] }}>
        <Form.Item
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入 MCP 名称' }]}
        >
          <Input placeholder="例如：filesystem" disabled={!!editingServer} />
        </Form.Item>

        <Form.Item
          name="configType"
          label="类型"
          rules={[{ required: true }]}
        >
          <Radio.Group options={CONFIG_TYPE_OPTIONS} />
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, cur) => prev.configType !== cur.configType}>
          {({ getFieldValue }) => {
            const configType = getFieldValue('configType');

            if (configType === 'stdio') {
              return (
                <>
                  <Form.Item
                    name="command"
                    label="命令"
                    rules={[{ required: true, message: '请选择命令' }]}
                  >
                    <Select options={COMMAND_OPTIONS} placeholder="选择命令" />
                  </Form.Item>

                  <Form.Item label="参数" required>
                    <Form.List name="args">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map((field) => (
                            <Space key={field.key} align="baseline" className="mb-2 flex">
                              <Form.Item
                                {...field}
                                name={[field.name, 'value']}
                                rules={[{ required: true, message: '请输入参数' }]}
                                className="mb-0 flex-1"
                              >
                                <Input placeholder="参数值" />
                              </Form.Item>
                              <MinusCircleOutlined onClick={() => remove(field.name)} className="text-gray-400 hover:text-red-500" />
                            </Space>
                          ))}
                          <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                            添加参数
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </Form.Item>

                  <Form.Item label="环境变量">
                    <Form.List name="env">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map((field) => (
                            <Space key={field.key} align="baseline" className="mb-2 flex">
                              <Form.Item
                                {...field}
                                name={[field.name, 'key']}
                                className="mb-0"
                              >
                                <Input placeholder="变量名" style={{ width: 140 }} />
                              </Form.Item>
                              <span>=</span>
                              <Form.Item
                                {...field}
                                name={[field.name, 'value']}
                                className="mb-0 flex-1"
                              >
                                <Input placeholder="变量值" />
                              </Form.Item>
                              <MinusCircleOutlined onClick={() => remove(field.name)} className="text-gray-400 hover:text-red-500" />
                            </Space>
                          ))}
                          <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                            添加环境变量
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </Form.Item>
                </>
              );
            }

            // http 类型
            return (
              <>
                <Form.Item
                  name="url"
                  label="URL"
                  rules={[{ required: true, message: '请输入 URL' }, { type: 'url', message: '请输入有效的 URL' }]}
                >
                  <Input placeholder="https://api.example.com/mcp" />
                </Form.Item>

                <Form.Item label="Headers">
                  <Form.List name="headers">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map((field) => (
                          <Space key={field.key} align="baseline" className="mb-2 flex">
                            <Form.Item
                              {...field}
                              name={[field.name, 'key']}
                              className="mb-0"
                            >
                              <Input placeholder="Header 名" style={{ width: 140 }} />
                            </Form.Item>
                            <span>=</span>
                            <Form.Item
                              {...field}
                              name={[field.name, 'value']}
                              className="mb-0 flex-1"
                            >
                              <Input placeholder="Header 值" />
                            </Form.Item>
                            <MinusCircleOutlined onClick={() => remove(field.name)} className="text-gray-400 hover:text-red-500" />
                          </Space>
                        ))}
                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                          添加 Header
                        </Button>
                      </>
                    )}
                  </Form.List>
                </Form.Item>
              </>
            );
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
});

export default McpServerModal;

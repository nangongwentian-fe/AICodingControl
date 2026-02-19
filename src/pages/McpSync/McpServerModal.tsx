import type { McpServerConfig, McpServerWithStatus } from './types';
import { Button, Form, Input, Modal, Radio, Select, Space } from 'antd';
import { memo, useEffect } from 'react';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { COMMAND_OPTIONS, CONFIG_TYPE_OPTIONS } from './const';
import { isHttpConfig, isStdioConfig } from './adapters';

export interface McpServerModalProps {
  open: boolean;
  editingServer: McpServerWithStatus | null;
  onOk: (name: string, config: McpServerConfig) => void;
  onCancel: () => void;
}

const McpServerModal = memo<McpServerModalProps>(({ open, editingServer, onOk, onCancel }) => {
  const { t } = useTranslation();
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
      title={editingServer ? t('mcpSync.modal.editTitle') : t('mcpSync.modal.addTitle')}
      open={open}
      onOk={() => void handleOk()}
      onCancel={onCancel}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      width={560}
    >
      <Form form={form} layout="vertical" initialValues={{ configType: 'stdio', args: [], env: [], headers: [] }}>
        <Form.Item
          name="name"
          label={t('mcpSync.modal.nameLabel')}
          rules={[{ required: true, message: t('mcpSync.modal.nameRequired') }]}
        >
          <Input placeholder={t('mcpSync.modal.namePlaceholder')} disabled={!!editingServer} />
        </Form.Item>

        <Form.Item
          name="configType"
          label={t('mcpSync.modal.typeLabel')}
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
                    label={t('mcpSync.modal.commandLabel')}
                    rules={[{ required: true, message: t('mcpSync.modal.commandRequired') }]}
                  >
                    <Select options={COMMAND_OPTIONS} placeholder={t('mcpSync.modal.commandPlaceholder')} />
                  </Form.Item>

                  <Form.Item label={t('mcpSync.modal.argsLabel')} required>
                    {getFieldValue('configType') === 'stdio' && (
                      <Form.List name="args">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map((field) => {
                              const { key, ...restField } = field;
                              return (
                                <Space key={key} align="baseline" className="mb-2 flex">
                                  <Form.Item
                                    {...restField}
                                    name={[field.name, 'value']}
                                    rules={[{ required: true, message: t('mcpSync.modal.argRequired') }]}
                                    className="mb-0 flex-1"
                                  >
                                    <Input placeholder={t('mcpSync.modal.argPlaceholder')} />
                                  </Form.Item>
                                  <MinusCircleOutlined onClick={() => remove(field.name)} className="text-gray-400 hover:text-red-500" />
                                </Space>
                              );
                            })}
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                              {t('mcpSync.modal.addArg')}
                            </Button>
                          </>
                        )}
                      </Form.List>
                    )}
                  </Form.Item>

                  <Form.Item label={t('mcpSync.modal.envLabel')}>
                    {getFieldValue('configType') === 'stdio' && (
                      <Form.List name="env">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map((field) => {
                              const { key, ...restField } = field;
                              return (
                                <Space key={key} align="baseline" className="mb-2 flex">
                                  <Form.Item
                                    {...restField}
                                    name={[field.name, 'key']}
                                    className="mb-0"
                                  >
                                    <Input placeholder={t('mcpSync.modal.envKeyPlaceholder')} style={{ width: 140 }} />
                                  </Form.Item>
                                  <span>=</span>
                                  <Form.Item
                                    {...restField}
                                    name={[field.name, 'value']}
                                    className="mb-0 flex-1"
                                  >
                                    <Input placeholder={t('mcpSync.modal.envValuePlaceholder')} />
                                  </Form.Item>
                                  <MinusCircleOutlined onClick={() => remove(field.name)} className="text-gray-400 hover:text-red-500" />
                                </Space>
                              );
                            })}
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                              {t('mcpSync.modal.addEnv')}
                            </Button>
                          </>
                        )}
                      </Form.List>
                    )}
                  </Form.Item>
                </>
              );
            }

            // http 类型
            return (
              <>
                <Form.Item
                  name="url"
                  label={t('mcpSync.modal.urlLabel')}
                  rules={[
                    { required: true, message: t('mcpSync.modal.urlRequired') },
                    { type: 'url', message: t('mcpSync.modal.urlInvalid') },
                  ]}
                >
                  <Input placeholder={t('mcpSync.modal.urlPlaceholder')} />
                </Form.Item>

                <Form.Item label={t('mcpSync.modal.headersLabel')}>
                  {getFieldValue('configType') === 'http' && (
                    <Form.List name="headers">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map((field) => {
                            const { key, ...restField } = field;
                            return (
                              <Space key={key} align="baseline" className="mb-2 flex">
                                <Form.Item
                                  {...restField}
                                  name={[field.name, 'key']}
                                  className="mb-0"
                                >
                                  <Input placeholder={t('mcpSync.modal.headerKeyPlaceholder')} style={{ width: 140 }} />
                                </Form.Item>
                                <span>=</span>
                                <Form.Item
                                  {...restField}
                                  name={[field.name, 'value']}
                                  className="mb-0 flex-1"
                                >
                                  <Input placeholder={t('mcpSync.modal.headerValuePlaceholder')} />
                                </Form.Item>
                                <MinusCircleOutlined onClick={() => remove(field.name)} className="text-gray-400 hover:text-red-500" />
                              </Space>
                            );
                          })}
                          <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                            {t('mcpSync.modal.addHeader')}
                          </Button>
                        </>
                      )}
                    </Form.List>
                  )}
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

import type { McpServerConfig, McpServerWithStatus } from './types';
import { memo, useCallback, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { COMMAND_OPTIONS, CONFIG_TYPE_OPTIONS } from './const';
import { isHttpConfig, isStdioConfig } from './adapters';

export interface McpServerModalProps {
  open: boolean;
  editingServer: McpServerWithStatus | null;
  onOk: (name: string, config: McpServerConfig) => void;
  onCancel: () => void;
}

interface FormValues {
  name: string;
  configType: 'stdio' | 'http';
  command: string;
  args: { value: string }[];
  env: { key: string; value: string }[];
  url: string;
  headers: { key: string; value: string }[];
}

const McpServerModal = memo<McpServerModalProps>(({ open, editingServer, onOk, onCancel }) => {
  const { t } = useTranslation();

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: '',
      configType: 'stdio',
      command: '',
      args: [],
      env: [],
      url: '',
      headers: [],
    },
  });

  const configType = watch('configType');

  const argsField = useFieldArray({ control, name: 'args' });
  const envField = useFieldArray({ control, name: 'env' });
  const headersField = useFieldArray({ control, name: 'headers' });

  useEffect(() => {
    if (!open) return;

    if (editingServer) {
      if (isStdioConfig(editingServer.config)) {
        reset({
          name: editingServer.name,
          configType: 'stdio',
          command: editingServer.config.command,
          args: editingServer.config.args.map(arg => ({ value: arg })),
          env: editingServer.config.env
            ? Object.entries(editingServer.config.env).map(([key, value]) => ({ key, value }))
            : [],
          url: '',
          headers: [],
        });
      } else if (isHttpConfig(editingServer.config)) {
        reset({
          name: editingServer.name,
          configType: 'http',
          command: '',
          args: [],
          env: [],
          url: editingServer.config.url,
          headers: editingServer.config.headers
            ? Object.entries(editingServer.config.headers).map(([key, value]) => ({ key, value }))
            : [],
        });
      }
    } else {
      reset({
        name: '',
        configType: 'stdio',
        command: '',
        args: [],
        env: [],
        url: '',
        headers: [],
      });
    }
  }, [open, editingServer, reset]);

  const onSubmit = useCallback((values: FormValues) => {
    let config: McpServerConfig;
    if (values.configType === 'stdio') {
      const envEntries = values.env?.filter(item => item.key && item.value) ?? [];
      config = {
        type: 'stdio',
        command: values.command,
        args: values.args?.map(item => item.value).filter(Boolean) ?? [],
        env: envEntries.length > 0
          ? Object.fromEntries(envEntries.map(item => [item.key, item.value]))
          : undefined,
      };
    } else {
      const headerEntries = values.headers?.filter(item => item.key && item.value) ?? [];
      config = {
        type: 'http',
        url: values.url,
        headers: headerEntries.length > 0
          ? Object.fromEntries(headerEntries.map(item => [item.key, item.value]))
          : undefined,
      };
    }
    onOk(values.name, config);
  }, [onOk]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editingServer ? t('mcpSync.modal.editTitle') : t('mcpSync.modal.addTitle')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>{t('mcpSync.modal.nameLabel')}</Label>
            <Controller
              name="name"
              control={control}
              rules={{ required: t('mcpSync.modal.nameRequired') }}
              render={({ field }) => (
                <Input {...field} placeholder={t('mcpSync.modal.namePlaceholder')} disabled={!!editingServer} />
              )}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {/* Config Type */}
          <div className="space-y-2">
            <Label>{t('mcpSync.modal.typeLabel')}</Label>
            <Controller
              name="configType"
              control={control}
              render={({ field }) => (
                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4">
                  {CONFIG_TYPE_OPTIONS.map(opt => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <RadioGroupItem value={opt.value} id={`config-type-${opt.value}`} />
                      <Label htmlFor={`config-type-${opt.value}`} className="cursor-pointer">{opt.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
          </div>

          {configType === 'stdio' ? (
            <>
              {/* Command */}
              <div className="space-y-2">
                <Label>{t('mcpSync.modal.commandLabel')}</Label>
                <Controller
                  name="command"
                  control={control}
                  rules={{ required: t('mcpSync.modal.commandRequired') }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('mcpSync.modal.commandPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMAND_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.command && <p className="text-sm text-destructive">{errors.command.message}</p>}
              </div>

              {/* Args */}
              <div className="space-y-2">
                <Label>{t('mcpSync.modal.argsLabel')}</Label>
                {argsField.fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <Controller
                      name={`args.${index}.value`}
                      control={control}
                      rules={{ required: t('mcpSync.modal.argRequired') }}
                      render={({ field: f, fieldState }) => (
                        <div className="flex-1 space-y-1">
                          <Input {...f} placeholder={t('mcpSync.modal.argPlaceholder')} />
                          {fieldState.error?.message ? (
                            <p className="text-sm text-destructive">{fieldState.error.message}</p>
                          ) : null}
                        </div>
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => argsField.remove(index)}
                      className="mt-2 text-muted-foreground hover:text-destructive"
                    >
                      <Icon icon="mdi:minus-circle-outline" width={20} height={20} />
                    </button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => argsField.append({ value: '' })}>
                  <Icon icon="mdi:plus" width={16} height={16} />
                  {t('mcpSync.modal.addArg')}
                </Button>
              </div>

              {/* Env */}
              <div className="space-y-2">
                <Label>{t('mcpSync.modal.envLabel')}</Label>
                {envField.fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Controller
                      name={`env.${index}.key`}
                      control={control}
                      render={({ field: f }) => (
                        <Input {...f} placeholder={t('mcpSync.modal.envKeyPlaceholder')} className="w-36" />
                      )}
                    />
                    <span className="text-muted-foreground">=</span>
                    <Controller
                      name={`env.${index}.value`}
                      control={control}
                      render={({ field: f }) => (
                        <Input {...f} placeholder={t('mcpSync.modal.envValuePlaceholder')} className="flex-1" />
                      )}
                    />
                    <button type="button" onClick={() => envField.remove(index)} className="text-muted-foreground hover:text-destructive">
                      <Icon icon="mdi:minus-circle-outline" width={20} height={20} />
                    </button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => envField.append({ key: '', value: '' })}>
                  <Icon icon="mdi:plus" width={16} height={16} />
                  {t('mcpSync.modal.addEnv')}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* URL */}
              <div className="space-y-2">
                <Label>{t('mcpSync.modal.urlLabel')}</Label>
                <Controller
                  name="url"
                  control={control}
                  rules={{
                    required: t('mcpSync.modal.urlRequired'),
                    pattern: { value: /^https?:\/\/.+/, message: t('mcpSync.modal.urlInvalid') },
                  }}
                  render={({ field }) => (
                    <Input {...field} placeholder={t('mcpSync.modal.urlPlaceholder')} />
                  )}
                />
                {errors.url && <p className="text-sm text-destructive">{errors.url.message}</p>}
              </div>

              {/* Headers */}
              <div className="space-y-2">
                <Label>{t('mcpSync.modal.headersLabel')}</Label>
                {headersField.fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Controller
                      name={`headers.${index}.key`}
                      control={control}
                      render={({ field: f }) => (
                        <Input {...f} placeholder={t('mcpSync.modal.headerKeyPlaceholder')} className="w-36" />
                      )}
                    />
                    <span className="text-muted-foreground">=</span>
                    <Controller
                      name={`headers.${index}.value`}
                      control={control}
                      render={({ field: f }) => (
                        <Input {...f} placeholder={t('mcpSync.modal.headerValuePlaceholder')} className="flex-1" />
                      )}
                    />
                    <button type="button" onClick={() => headersField.remove(index)} className="text-muted-foreground hover:text-destructive">
                      <Icon icon="mdi:minus-circle-outline" width={20} height={20} />
                    </button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => headersField.append({ key: '', value: '' })}>
                  <Icon icon="mdi:plus" width={16} height={16} />
                  {t('mcpSync.modal.addHeader')}
                </Button>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>{t('common.cancel')}</Button>
            <Button type="submit">{t('common.confirm')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default McpServerModal;

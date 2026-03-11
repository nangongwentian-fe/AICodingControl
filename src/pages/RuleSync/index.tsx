import type { AiToolWithLogo } from '@/hooks/useAiTools';
import { toast } from 'sonner';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import CodeEditor from '@/components/CodeEditor';
import { useAiTools } from '@/hooks/useAiTools';
import { expandPath } from '@/utils/path';

const AGENTS_FILE = 'AGENTS.md';

const RuleSync = memo(() => {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [filePath, setFilePath] = useState('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingTool, setViewingTool] = useState<AiToolWithLogo | null>(null);
  const [viewingContent, setViewingContent] = useState('');

  const { ruleTools, loading: toolsLoading } = useAiTools();

  useEffect(() => {
    const loadAgentsFile = async () => {
      const dataDir = await window.electronAPI.getDataDir();
      const path = `${dataDir}/${AGENTS_FILE}`;
      setFilePath(path);
      const result = await window.electronAPI.readFile(path);
      if (result.success) {
        setCode(result.content ?? '');
      }
    };
    void loadAgentsFile();
  }, []);

  const handleChange = (value: string | undefined) => {
    const newValue = value ?? '';
    setCode(newValue);
    if (filePath) {
      void window.electronAPI.writeFile(filePath, newValue);
    }
  };

  const handleSync = async (tool: AiToolWithLogo) => {
    if (!tool.ruleTargetPath) return;
    const fullPath = await expandPath(tool.ruleTargetPath);
    const result = await window.electronAPI.writeFile(fullPath, code);
    if (result.success) {
      toast.success(t('ruleSync.syncSuccess', { toolName: tool.name }));
    }
    else {
      toast.error(t('ruleSync.syncFailed', { error: result.error ?? t('common.unknownError') }));
    }
  };

  const handleView = async (tool: AiToolWithLogo) => {
    if (!tool.ruleTargetPath) return;
    const fullPath = await expandPath(tool.ruleTargetPath);
    const result = await window.electronAPI.readFile(fullPath);
    setViewingTool(tool);
    setViewingContent(result.success ? (result.content ?? '') : '');
    setViewModalOpen(true);
  };

  const handleViewingContentChange = async (value: string | undefined) => {
    const newValue = value ?? '';
    setViewingContent(newValue);
    if (viewingTool?.ruleTargetPath) {
      const fullPath = await expandPath(viewingTool.ruleTargetPath);
      void window.electronAPI.writeFile(fullPath, newValue);
    }
  };

  if (toolsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner tip={t('common.loading')} />
      </div>
    );
  }

  return (
    <div>
      <CodeEditor height="400px" language="markdown" value={code} onChange={handleChange} />
      <div className="mt-4 grid grid-cols-4 gap-4">
        {ruleTools.map(tool => (
          <Card key={tool.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {tool.logoSrc && (
                  <Avatar className="h-6 w-6 rounded-sm">
                    <AvatarImage src={tool.logoSrc} />
                  </Avatar>
                )}
                <span>{tool.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm">{t('ruleSync.syncButton')}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('ruleSync.confirmSyncTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('ruleSync.confirmSyncDescription', { toolName: tool.name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void handleSync(tool)}>
                        {t('common.confirm')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="outline" size="sm" onClick={() => void handleView(tool)}>
                  {t('ruleSync.viewButton')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={viewModalOpen} onOpenChange={(open) => { if (!open) setViewModalOpen(false); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {viewingTool
                ? t('ruleSync.viewModalTitle', { toolName: viewingTool.name })
                : t('ruleSync.viewModalTitleDefault')}
            </DialogTitle>
          </DialogHeader>
          <CodeEditor height="400px" language="markdown" value={viewingContent} onChange={handleViewingContentChange} />
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default RuleSync;

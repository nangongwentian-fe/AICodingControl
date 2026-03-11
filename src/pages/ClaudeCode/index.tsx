import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import CodeEditor from '@/components/CodeEditor'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { expandPath } from '@/utils/path'
import { createDebouncedFileWriter } from '@/utils/file'
import { CLAUDE_CONFIG_CONTENT, CLAUDE_CONFIG_PATH, CLAUDE_JSON_PATH, CLAUDE_SETTINGS_PATH } from './const'

type BypassStatus = 'checking' | 'bypassed' | 'not_bypassed'

const ClaudeCode = memo(() => {
  const { t } = useTranslation()
  const [status, setStatus] = useState<BypassStatus>('checking')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [configFullPath, setConfigFullPath] = useState<string>(CLAUDE_CONFIG_PATH)

  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [settingsContent, setSettingsContent] = useState('')
  const [settingsFullPath, setSettingsFullPath] = useState('')

  const [claudeJsonModalOpen, setClaudeJsonModalOpen] = useState(false)
  const [claudeJsonContent, setClaudeJsonContent] = useState('')
  const [claudeJsonFullPath, setClaudeJsonFullPath] = useState('')

  const checkBypassStatus = useCallback(async () => {
    try {
      const configPath = await expandPath(CLAUDE_CONFIG_PATH)
      setConfigFullPath(configPath)
      const result = await window.electronAPI.readFile(configPath)
      if (result.success && result.content) {
        const config = JSON.parse(result.content)
        if (config.primaryApiKey && config.primaryApiKey.trim() !== '') {
          setStatus('bypassed')
          return
        }
      }
      setStatus('not_bypassed')
    } catch {
      setStatus('not_bypassed')
    }
  }, [])

  const handleBypass = useCallback(async () => {
    if (status === 'bypassed') {
      setIsModalOpen(true)
      return
    }
    try {
      const configPath = await expandPath(CLAUDE_CONFIG_PATH)
      setConfigFullPath(configPath)
      const result = await window.electronAPI.writeFile(configPath, JSON.stringify(CLAUDE_CONFIG_CONTENT, null, 2))
      if (result.success) {
        setStatus('bypassed')
        toast.success(t('claudeCode.bypassSuccess'))
      } else {
        toast.error(t('claudeCode.createConfigFailed'))
      }
    } catch {
      toast.error(t('claudeCode.createConfigFailed'))
    }
  }, [status, t])

  const handleCloseModal = useCallback(() => { setIsModalOpen(false) }, [])
  const handleCloseSettingsModal = useCallback(() => { setSettingsModalOpen(false) }, [])

  const loadSettingsContent = useCallback(async () => {
    const settingsPath = await expandPath(CLAUDE_SETTINGS_PATH)
    setSettingsFullPath(settingsPath)
    const result = await window.electronAPI.readFile(settingsPath)
    if (result.success && result.content) {
      setSettingsContent(result.content)
    } else {
      setSettingsContent('{}')
    }
  }, [])

  const debouncedSaveSettings = useMemo(
    () => createDebouncedFileWriter(() => settingsFullPath, { delay: 1000 }),
    [settingsFullPath],
  )

  const handleSettingsChange = useCallback((value: string | undefined) => {
    const newContent = value ?? ''
    setSettingsContent(newContent)
    debouncedSaveSettings(newContent)
  }, [debouncedSaveSettings])

  const handleOpenSettings = useCallback(async () => {
    await loadSettingsContent()
    setSettingsModalOpen(true)
  }, [loadSettingsContent])

  const handleCloseClaudeJsonModal = useCallback(() => { setClaudeJsonModalOpen(false) }, [])

  const loadClaudeJsonContent = useCallback(async () => {
    const filePath = await expandPath(CLAUDE_JSON_PATH)
    setClaudeJsonFullPath(filePath)
    const result = await window.electronAPI.readFile(filePath)
    if (result.success && result.content) {
      setClaudeJsonContent(result.content)
    } else {
      setClaudeJsonContent('{}')
    }
  }, [])

  const debouncedSaveClaudeJson = useMemo(
    () => createDebouncedFileWriter(() => claudeJsonFullPath, { delay: 1000 }),
    [claudeJsonFullPath],
  )

  const handleClaudeJsonChange = useCallback((value: string | undefined) => {
    const newContent = value ?? ''
    setClaudeJsonContent(newContent)
    debouncedSaveClaudeJson(newContent)
  }, [debouncedSaveClaudeJson])

  const handleOpenClaudeJson = useCallback(async () => {
    await loadClaudeJsonContent()
    setClaudeJsonModalOpen(true)
  }, [loadClaudeJsonContent])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      void checkBypassStatus()
    })
    return () => { cancelled = true }
  }, [checkBypassStatus])

  const isBypassed = status === 'bypassed'
  const buttonText = isBypassed ? t('claudeCode.buttonBypassed') : t('claudeCode.buttonBypass')

  return (
    <div className="flex gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={cn(isBypassed && 'bg-green-500 hover:bg-green-600 text-white')}
            variant={isBypassed ? 'default' : 'outline'}
            onClick={() => void handleBypass()}
            disabled={status === 'checking'}
          >
            {buttonText}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">{t('claudeCode.tooltipBypass')}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" onClick={() => void handleOpenSettings()}>
            {t('claudeCode.openSettings')}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">{t('claudeCode.tooltipSettings')}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" onClick={() => void handleOpenClaudeJson()}>
            {t('claudeCode.openClaudeJson')}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">{t('claudeCode.tooltipClaudeJson')}</TooltipContent>
      </Tooltip>

      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) handleCloseModal() }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{configFullPath}</DialogTitle></DialogHeader>
          <CodeEditor value={JSON.stringify(CLAUDE_CONFIG_CONTENT, null, 2)} language="json" height="400px" />
        </DialogContent>
      </Dialog>

      <Dialog open={settingsModalOpen} onOpenChange={(open) => { if (!open) handleCloseSettingsModal() }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{settingsFullPath}</DialogTitle></DialogHeader>
          <CodeEditor value={settingsContent} language="json" height="400px" onChange={handleSettingsChange} />
        </DialogContent>
      </Dialog>

      <Dialog open={claudeJsonModalOpen} onOpenChange={(open) => { if (!open) handleCloseClaudeJsonModal() }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{claudeJsonFullPath}</DialogTitle></DialogHeader>
          <CodeEditor value={claudeJsonContent} language="json" height="400px" onChange={handleClaudeJsonChange} />
        </DialogContent>
      </Dialog>
    </div>
  )
})

export default ClaudeCode

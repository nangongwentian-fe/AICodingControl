import { Button, message, Modal, Tooltip } from 'antd'
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

  // settings.json 相关状态
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [settingsContent, setSettingsContent] = useState('')
  const [settingsFullPath, setSettingsFullPath] = useState('')

  // .claude.json 相关状态
  const [claudeJsonModalOpen, setClaudeJsonModalOpen] = useState(false)
  const [claudeJsonContent, setClaudeJsonContent] = useState('')
  const [claudeJsonFullPath, setClaudeJsonFullPath] = useState('')


  // 检查是否已绕过 Plugin 登陆（通过验证 config 文件是否存在且包含有效的 primaryApiKey）
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

  // 处理绕过 Plugin 登陆的点击事件，创建配置文件
  const handleBypass = useCallback(async () => {
    if (status === 'bypassed') {
      setIsModalOpen(true)
      return
    }

    try {
      const configPath = await expandPath(CLAUDE_CONFIG_PATH)
      setConfigFullPath(configPath)
      const result = await window.electronAPI.writeFile(
        configPath,
        JSON.stringify(CLAUDE_CONFIG_CONTENT, null, 2)
      )

      if (result.success) {
        setStatus('bypassed')
        message.success(t('claudeCode.bypassSuccess'))
      } else {
        message.error(t('claudeCode.createConfigFailed'))
      }
    } catch {
      message.error(t('claudeCode.createConfigFailed'))
    }
  }, [status, t])

  // 关闭 Modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  // 关闭 settings Modal
  const handleCloseSettingsModal = useCallback(() => {
    setSettingsModalOpen(false)
  }, [])

  // 读取 settings.json 内容
  const loadSettingsContent = useCallback(async () => {
    const settingsPath = await expandPath(CLAUDE_SETTINGS_PATH)
    setSettingsFullPath(settingsPath)
    const result = await window.electronAPI.readFile(settingsPath)
    if (result.success && result.content) {
      setSettingsContent(result.content)
    } else {
      // 文件不存在时使用空对象
      setSettingsContent('{}')
    }
  }, [])

  // 防抖保存 settings.json
  const debouncedSaveSettings = useMemo(
    () => createDebouncedFileWriter(() => settingsFullPath, { delay: 1000 }),
    [settingsFullPath],
  )

  // 处理 settings 内容变更
  const handleSettingsChange = useCallback((value: string | undefined) => {
    const newContent = value ?? ''
    setSettingsContent(newContent)
    debouncedSaveSettings(newContent)
  }, [debouncedSaveSettings])

  // 打开 settings.json
  const handleOpenSettings = useCallback(async () => {
    await loadSettingsContent()
    setSettingsModalOpen(true)
  }, [loadSettingsContent])

  // 关闭 .claude.json Modal
  const handleCloseClaudeJsonModal = useCallback(() => {
    setClaudeJsonModalOpen(false)
  }, [])

  // 读取 .claude.json 内容
  const loadClaudeJsonContent = useCallback(async () => {
    const filePath = await expandPath(CLAUDE_JSON_PATH)
    setClaudeJsonFullPath(filePath)
    const result = await window.electronAPI.readFile(filePath)
    if (result.success && result.content) {
      setClaudeJsonContent(result.content)
    } else {
      // 文件不存在时使用空对象
      setClaudeJsonContent('{}')
    }
  }, [])

  // 防抖保存 .claude.json
  const debouncedSaveClaudeJson = useMemo(
    () => createDebouncedFileWriter(() => claudeJsonFullPath, { delay: 1000 }),
    [claudeJsonFullPath],
  )

  // 处理 .claude.json 内容变更
  const handleClaudeJsonChange = useCallback((value: string | undefined) => {
    const newContent = value ?? ''
    setClaudeJsonContent(newContent)
    debouncedSaveClaudeJson(newContent)
  }, [debouncedSaveClaudeJson])

  // 打开 .claude.json
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
    return () => {
      cancelled = true
    }
  }, [checkBypassStatus])

  const isBypassed = status === 'bypassed'
  const buttonText = isBypassed ? t('claudeCode.buttonBypassed') : t('claudeCode.buttonBypass')

  return (
    <div className="flex gap-2">
      <Tooltip title={t('claudeCode.tooltipBypass')} placement="bottomRight">
        <Button
          type={isBypassed ? 'primary' : 'default'}
          style={isBypassed ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : undefined}
          onClick={handleBypass}
          loading={status === 'checking'}
        >
          {buttonText}
        </Button>
      </Tooltip>

      <Tooltip title={t('claudeCode.tooltipSettings')} placement="bottomRight">
        <Button onClick={handleOpenSettings}>
          {t('claudeCode.openSettings')}
        </Button>
      </Tooltip>

      <Tooltip title={t('claudeCode.tooltipClaudeJson')} placement="bottomRight">
        <Button onClick={handleOpenClaudeJson}>
          {t('claudeCode.openClaudeJson')}
        </Button>
      </Tooltip>

      <Modal
        title={configFullPath}
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={800}
      >
        <CodeEditor
          value={JSON.stringify(CLAUDE_CONFIG_CONTENT, null, 2)}
          language="json"
          height="400px"
        />
      </Modal>

      <Modal
        title={settingsFullPath}
        open={settingsModalOpen}
        onCancel={handleCloseSettingsModal}
        footer={null}
        width={800}
      >
        <CodeEditor
          value={settingsContent}
          language="json"
          height="400px"
          onChange={handleSettingsChange}
        />
      </Modal>

      <Modal
        title={claudeJsonFullPath}
        open={claudeJsonModalOpen}
        onCancel={handleCloseClaudeJsonModal}
        footer={null}
        width={800}
      >
        <CodeEditor
          value={claudeJsonContent}
          language="json"
          height="400px"
          onChange={handleClaudeJsonChange}
        />
      </Modal>
    </div>
  )
})

export default ClaudeCode

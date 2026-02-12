import { Button, message, Modal, Tooltip } from 'antd'
import CodeEditor from '@/components/CodeEditor'
import { memo, useCallback, useEffect, useState } from 'react'
import { expandPath } from '@/utils/path'
import { CLAUDE_CONFIG_CONTENT, CLAUDE_CONFIG_PATH } from './const'

type BypassStatus = 'checking' | 'bypassed' | 'not_bypassed'

const ClaudeCode = memo(() => {
  const [status, setStatus] = useState<BypassStatus>('checking')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [configFullPath, setConfigFullPath] = useState<string>(CLAUDE_CONFIG_PATH)


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
        message.success('已成功绕过Plugin登陆')
      } else {
        message.error('创建配置文件失败')
      }
    } catch {
      message.error('创建配置文件失败')
    }
  }, [status])

  // 关闭 Modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

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
  const buttonText = isBypassed ? '已绕过Plugin登陆' : '一键绕过Plugin登陆'

  return (
    <div>
      <Tooltip title="通过创建~/.claude/config.json绕过Plugin登陆" placement="bottomRight">
        <Button
          type={isBypassed ? 'primary' : 'default'}
          style={isBypassed ? { backgroundColor: '#52c41a', borderColor: '#52c41a' } : undefined}
          onClick={handleBypass}
          loading={status === 'checking'}
        >
          {buttonText}
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
    </div>
  )
})

export default ClaudeCode

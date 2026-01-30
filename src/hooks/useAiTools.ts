import { useEffect, useState } from 'react';
import type { AiToolConfig, AiToolsConfig } from '@/types/ai-tools';

import antigravityLogo from '@/assets/images/antigravity.png';
import claudeCodeLogo from '@/assets/images/claude_code.svg';
import codexLogo from '@/assets/images/codex.svg';
import cursorLogo from '@/assets/images/cursor.jpeg';
import opencodeLogo from '@/assets/images/opencode.png';
import traeLogo from '@/assets/images/trae.png';

const LOGO_MAP: Record<string, string> = {
  trae: traeLogo,
  traecn: traeLogo,
  cursor: cursorLogo,
  opencode: opencodeLogo,
  codex: codexLogo,
  claudecode: claudeCodeLogo,
  antigravity: antigravityLogo,
};

export interface AiToolWithLogo extends AiToolConfig {
  logoSrc: string;
}

export function useAiTools() {
  const [tools, setTools] = useState<AiToolWithLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTools = async () => {
      try {
        const result = await window.electronAPI.getAiTools();
        if (result.success && result.data) {
          const toolsWithLogo = result.data.tools.map((tool: AiToolConfig) => ({
            ...tool,
            logoSrc: LOGO_MAP[tool.id] || '',
          }));
          setTools(toolsWithLogo);
        } else {
          setError(result.error || '加载失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };
    void loadTools();
  }, []);

  // 获取支持 MCP 的工具
  const mcpTools = tools.filter((t) => t.mcpConfigPath !== null);

  // 获取支持 Rule 的工具
  const ruleTools = tools.filter((t) => t.ruleTargetPath !== null);

  const saveTools = async (config: AiToolsConfig) => {
    return window.electronAPI.saveAiTools(config);
  };

  return { tools, mcpTools, ruleTools, loading, error, saveTools };
}

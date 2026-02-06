<p align="right">
  <a href="README.md">中文</a> | <a href="README_EN.md">English</a>
</p>

<p align="center">
  <img src="build/icon.png" alt="AI Coding Control" width="128" />
</p>

<h1 align="center">AI Coding Control</h1>

<p align="center">
  集中管理和同步多个 AI 编程助手配置的桌面应用
</p>

---

如果你同时使用多个 AI 编程工具（Claude Code、Cursor、Trae、Codex 等），一定深知在不同工具间手动同步 Rules、MCP 服务器、Skills 和 Commands 配置的痛苦。**AI Coding Control** 提供统一的可视化界面，一站式管理所有工具的配置。

## 功能特性

- **Rule 同步** — 编写一份编码规则，一键同步到所有工具（CLAUDE.md、AGENTS.md、user_rules.md 等）
- **MCP 同步** — 可视化管理 MCP（Model Context Protocol）服务器配置，支持按工具独立开关
- **Skills 同步** — 在工具间一键复制技能包
- **Commands 同步** — 保持自定义命令在所有 AI 助手间一致
- **可视化编辑器** — 内置 Monaco 编辑器，直接编辑规则和配置
- **可扩展** — 支持通过配置文件添加自定义 AI 工具

## 支持的工具

| 工具 | Rules | MCP | Skills | Commands |
|------|:-----:|:---:|:------:|:--------:|
| [Trae](https://www.trae.ai/) | ✅ | ✅ | ✅ | ✅ |
| TraeCN | ✅ | ✅ | ✅ | ✅ |
| [Cursor](https://cursor.sh/) | — | ✅ | ✅ | ✅ |
| [OpenCode](https://opencode.ai/) | ✅ | ✅ | ✅ | ✅ |
| [Codex](https://github.com/openai/codex) | ✅ | ✅ | ✅ | ✅ |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | ✅ | ✅ | ✅ | ✅ |
| [Antigravity](https://codeium.com/) | ✅ | ✅ | ✅ | ✅ |

## 技术栈

- **Electron** — 跨平台桌面应用
- **React 18** + **TypeScript** — UI 框架
- **Vite** — 构建工具
- **Ant Design** — UI 组件库
- **Monaco Editor** — 代码编辑器（与 VS Code 同款）
- **Tailwind CSS** + **Sass** — 样式方案

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/)

### 安装

```bash
git clone https://github.com/your-username/ai-coding-control.git
cd ai-coding-control
pnpm install
```

### 开发

```bash
# 同时启动前端和 Electron（推荐）
pnpm run dev

# 仅启动前端
pnpm run dev:react

# 仅启动 Electron
pnpm run dev:electron
```

### 构建

```bash
# 完整构建（前端 + Electron 打包）
pnpm run build

# 仅构建前端
pnpm run build:react

# 仅打包 Electron
pnpm run build:electron
```

## 项目结构

```
ai-coding-control/
├── electron/              # Electron 主进程
│   ├── main.cjs           # 主进程入口（窗口管理、IPC、文件操作）
│   └── preload.cjs        # 预加载脚本（安全暴露 API）
├── src/                   # React 前端源码
│   ├── components/        # 通用组件（CodeEditor、Header 等）
│   ├── hooks/             # 自定义 Hooks
│   ├── pages/             # 页面
│   │   ├── RuleSync/      # Rule 同步
│   │   ├── McpSync/       # MCP 同步
│   │   ├── SkillsSync/    # Skills 同步
│   │   └── CommandsSync/  # Commands 同步
│   ├── router/            # 路由配置
│   ├── types/             # TypeScript 类型定义
│   └── styles/            # 全局样式
├── build/                 # 打包资源（图标等）
└── package.json
```

## 配置说明

应用数据存储在 `~/.ai-coding-control/` 目录下：

- `ai_coding_tools.json` — AI 工具配置列表（可自定义扩展）
- `AGENTS.md` — 本地 Rule 文件
- `mcp.json` — MCP 服务器配置

### 添加自定义工具

编辑 `~/.ai-coding-control/ai_coding_tools.json`，添加新的工具配置：

```json
{
  "id": "my-tool",
  "name": "My AI Tool",
  "ruleTargetPath": "~/.my-tool/rules.md",
  "mcpConfigPath": "~/.my-tool/mcp.json",
  "mcpConfigKey": "mcpServers",
  "mcpFormat": "json",
  "skillsPath": "~/.my-tool/skills",
  "commandsPath": "~/.my-tool/commands"
}
```

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feat/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feat/amazing-feature`)
5. 提交 Pull Request

## 许可证

[MIT](LICENSE)

# Repository Guidelines

## 项目结构与模块组织
- `src/`：前端源码（React + Vite），主要入口为 `src/main.tsx` 与 `src/App.tsx`。
- `src/pages/`、`src/components/`、`src/hooks/`、`src/router/`：页面、组件、Hooks 与路由。
- `src/assets/`、`public/`：静态资源与公共资源。
- `electron/`：Electron 主进程相关代码。
- `build/`、`dist/`、`dist-electron/`：构建产物与打包输出目录。

## 构建、测试与开发命令
- `pnpm run dev`：同时启动 Vite 前端与 Electron 主进程（本地开发）。
- `pnpm run dev:react`：仅启动前端开发服务器（Vite）。
- `pnpm run dev:electron`：仅启动 Electron 主进程。
- `pnpm run build`：先构建前端再打包 Electron 应用。
- `pnpm run lint` / `pnpm run lint:fix`：运行 ESLint 检查与自动修复。
- `pnpm run preview`：预览 Vite 构建产物。

## 编码风格与命名约定
- 语言：TypeScript + React，遵循 ESLint 规则与项目既有写法。
- 命名：组件使用 `PascalCase`，hooks 使用 `useXxx`，样式文件使用 `*.module.scss`。
- 目录：业务页面优先放在 `src/pages/`，共用组件放在 `src/components/`。
- 路径别名：使用 `@/` 指向 `src/`，避免多级相对路径（如 `@/components/Button`）。
- 常量：优先放在当前组件目录下的 `const.ts`/`const.tsx`，保持组件文件简洁。
- 类型：优先放在当前组件目录下的 `types.ts`/`types.tsx`，集中管理类型定义。
- 工具函数：优先使用 `lodash` 现有方法，而非从 0 实现。

## 测试指南
- 当前仓库未发现自动化测试配置或测试文件（如 `*.test.*` / `*.spec.*`）。
- 若新增测试，请同步补充运行方式与测试目录约定。

## 提交与 PR 指南
- 提交信息遵循 `type: 描述` 形式，常见类型为 `feat:`（参考最近提交记录）。
- PR 建议包含：变更说明、影响范围、必要的截图（UI 改动）与复现/验证步骤。

## 配置与安全提示
- 打包配置位于 `package.json` 的 `build` 字段；图标资源在 `build/`。
- 不要提交敏感信息；本地环境变量应避免写入仓库。

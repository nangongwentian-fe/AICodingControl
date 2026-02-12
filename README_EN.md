# AI Coding Control

English | [简体中文](./README.md)

AI Coding Control is a powerful AI programming assistant tool that helps developers manage and synchronize configuration files for various AI tools.

## ✨ Features

- 🔄 **Rule Sync**: Manage and synchronize AI programming tool rule files like .cursorrules, .windsurfrules, etc.
- 🛠️ **MCP Sync**: Synchronize and manage MCP (Model Context Protocol) server configurations
- 🎯 **Skills Sync**: Manage and synchronize custom skills for AI tools
- 💬 **Commands Sync**: Synchronize and manage custom commands for AI tools
- 🎨 **Modern UI**: Clean and beautiful user interface based on Ant Design
- ⚡ **Fast Startup**: Built with Vite for an excellent development experience
- 🖥️ **Cross-platform**: Based on Electron, supports Windows, macOS, and Linux

## 🚀 Tech Stack

- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Desktop App**: Electron
- **UI Component Library**: Ant Design
- **Code Editor**: Monaco Editor
- **Routing**: React Router
- **Styling**: Sass + TailwindCSS
- **Package Manager**: pnpm

## 📦 Installation

Make sure you have the following environment installed:

- Node.js >= 18
- pnpm >= 8

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/nangongwentian-fe/AICodingControl.git

# Navigate to the project directory
cd AICodingControl

# Install dependencies
pnpm install
```

## 🛠️ Development

### Start Development Server

```bash
# Start both Vite frontend and Electron main process
pnpm run dev

# Or start them separately
pnpm run dev:react    # Start frontend development server only
pnpm run dev:electron # Start Electron main process only
```

### Code Linting

```bash
# Run ESLint checks
pnpm run lint

# Auto-fix ESLint issues
pnpm run lint:fix
```

## 📦 Build

### Build Application

```bash
# Build frontend and package Electron application
pnpm run build

# Or build step by step
pnpm run build:react    # Build frontend only
pnpm run build:electron # Package Electron app only
```

Build outputs:
- Frontend build output: `dist/`
- Electron package output: `dist-electron/`

### Preview Build

```bash
pnpm run preview
```

## 📁 Project Structure

```
AICodingControl/
├── src/                    # Frontend source code
│   ├── pages/             # Page components
│   │   ├── RuleSync/      # Rule sync page
│   │   ├── McpSync/       # MCP sync page
│   │   ├── SkillsSync/    # Skills sync page
│   │   └── CommandsSync/  # Commands sync page
│   ├── components/        # Shared components
│   ├── hooks/            # Custom Hooks
│   ├── router/           # Router configuration
│   ├── assets/           # Static assets
│   ├── styles/           # Style files
│   ├── types/            # TypeScript type definitions
│   ├── App.tsx           # Root component
│   └── main.tsx          # Application entry
├── electron/              # Electron main process code
│   ├── main.cjs          # Main process entry
│   └── preload.cjs       # Preload script
├── build/                # Build resources (icons, etc.)
├── public/               # Public static assets
├── dist/                 # Frontend build output
├── dist-electron/        # Electron package output
└── package.json          # Project configuration
```

## 🤝 Contributing

Issues and Pull Requests are welcome!

Before submitting code, please ensure:
1. Code passes ESLint checks (`pnpm run lint`)
2. Follow the project's code style and naming conventions
3. Commit messages follow the `type: description` format (e.g., `feat: add new feature`)

## 📄 License

MIT License

## 🙏 Acknowledgments

Thanks to all the developers who have contributed to this project!

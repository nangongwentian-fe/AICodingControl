import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // 忽略的文件
  {
    ignores: [
      'dist',
      'dist-electron',
      'node_modules',
      '*.config.js',
      '*.config.ts',
      'electron/**/*.cjs',
    ],
  },
  // 基础配置
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // React 配置
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // 禁用 display name 检测
      'react/display-name': 'off',
      // 禁用 prop-types 检测（TypeScript 已提供类型检查）
      'react/prop-types': 'off',
      // 禁用 floating promises 检测
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  // Prettier 配置（禁用与 Prettier 冲突的规则）
  prettierConfig,
);

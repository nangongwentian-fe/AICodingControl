import antfu from '@antfu/eslint-config';

export default antfu({
  // 启用 React 支持
  react: true,

  // TypeScript 配置
  typescript: {
    tsconfigPath: 'tsconfig.json',
  },

  // 代码风格配置
  stylistic: {
    indent: 2,
    quotes: 'single',
    semi: true, // 保留分号（与 Prettier 默认行为一致）
  },

  // 忽略的文件
  ignores: [
    'dist',
    'dist-electron',
    'node_modules',
    'electron/**/*.cjs',
  ],

  // 自定义规则覆盖
  rules: {
    // 允许 console（开发阶段）
    'no-console': 'off',
    // 关闭 floating promises 检测
    'ts/no-floating-promises': 'off',
    // 关闭严格布尔表达式检测（需要 strictNullChecks）
    'ts/strict-boolean-expressions': 'off',
  },
});

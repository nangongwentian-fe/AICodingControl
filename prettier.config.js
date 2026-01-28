/** @type {import("prettier").Config} */
export default {
  // 单行最大长度
  printWidth: 100,
  // 使用 2 个空格缩进
  tabWidth: 2,
  // 使用空格而不是制表符
  useTabs: false,
  // 语句末尾添加分号
  semi: true,
  // 使用单引号
  singleQuote: true,
  // 对象属性的引号使用：仅在需要时添加
  quoteProps: 'as-needed',
  // JSX 中使用单引号
  jsxSingleQuote: false,
  // 尾随逗号：ES5 兼容（对象、数组等）
  trailingComma: 'es5',
  // 对象字面量的括号间距
  bracketSpacing: true,
  // JSX 标签的右尖括号是否另起一行
  bracketSameLine: false,
  // 箭头函数参数括号：始终包含
  arrowParens: 'always',
  // 换行符：自动
  endOfLine: 'auto',
  // Tailwind CSS 插件
  plugins: ['prettier-plugin-tailwindcss'],
};

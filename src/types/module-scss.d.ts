// CSS Modules 类型声明
declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

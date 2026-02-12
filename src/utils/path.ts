/**
 * 跨平台路径处理工具函数
 * 统一处理不同操作系统之间的路径兼容问题
 */

/**
 * 展开路径中的 ~ 为用户主目录，支持跨平台路径分隔符
 * @param path - 原始路径（可能包含 ~/ 前缀）
 * @returns 展开后的完整路径
 * @example
 * await expandPath('~/.claude/config.json')
 * // macOS/Linux: '/home/user/.claude/config.json'
 * // Windows: 'C:\\Users\\user\\.claude\\config.json'
 */
export async function expandPath(path: string): Promise<string> {
  if (path.startsWith('~/')) {
    const homeDir = await window.electronAPI.getHomeDir();
    const relativePath = path.slice(2);
    const platform = window.electronAPI.platform;
    const separator = platform === 'win32' ? '\\' : '/';
    return `${homeDir}${separator}${relativePath.replace(/\//g, separator)}`;
  }
  return path;
}

/**
 * 跨平台路径拼接
 * 将多个路径部分拼接成一个完整路径，自动处理路径分隔符
 * @param parts - 路径部分
 * @returns 拼接后的路径（使用正斜杠作为分隔符）
 * @example
 * joinPath('/home/user', '/folder/', '/file.txt')
 * // 返回: '/home/user/folder/file.txt'
 */
export function joinPath(...parts: string[]): string {
  const normalized = parts
    .filter(Boolean)
    .map((part, index) => {
      if (index === 0) return part.replace(/\/$/, '');
      return part.replace(/^\/+/, '').replace(/\/$/, '');
    });
  return normalized.join('/');
}

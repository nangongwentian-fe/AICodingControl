import debounce from 'lodash/debounce';

interface DebouncedFileWriterOptions {
  delay?: number;
}

/**
 * 创建带防抖的文件写入函数
 */
export function createDebouncedFileWriter(
  getFilePath: () => string,
  options: DebouncedFileWriterOptions = {}
) {
  const { delay = 1000 } = options;

  return debounce((content: string) => {
    const filePath = getFilePath();
    if (filePath) {
      window.electronAPI.writeFile(filePath, content);
    }
  }, delay);
}

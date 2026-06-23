// File System Access API 类型补充
// 浏览器已原生支持，但 TypeScript 类型可能不完整

interface FileSystemDirectoryHandle {
  queryPermission(descriptor?: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission(descriptor?: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  values(): AsyncIterableIterator<FileSystemHandle>;
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}

interface Window {
  showDirectoryPicker(options?: {
    mode?: "read" | "readwrite";
  }): Promise<FileSystemDirectoryHandle>;
}

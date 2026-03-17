interface FileSystemDirectoryHandle {
  entries?: () => AsyncIterableIterator<[string, FileSystemHandle]>;
  values?: () => AsyncIterableIterator<FileSystemHandle>;
  requestPermission?: () => Promise<"granted" | "denied" | "prompt">;
  queryPermission?: (opts?: { mode?: "read" | "readwrite" }) => Promise<"granted" | "denied" | "prompt">;
}

interface DataTransferItem {
  getAsFileSystemHandle?: () => Promise<FileSystemHandle | undefined>;
}

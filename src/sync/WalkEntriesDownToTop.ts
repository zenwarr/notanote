import { StorageEntryPointer, StorageError, StorageErrorCode } from "@storage/entry-storage";


export async function* walkEntriesDownToTop(entry: StorageEntryPointer): AsyncGenerator<StorageEntryPointer> {
  let isDir = false;
  try {
    const stats = await entry.stats();
    isDir = stats.isDirectory;
  } catch (err: unknown) {
    if (err instanceof StorageError && err.code === StorageErrorCode.NotExists) {
      return;
    } else {
      throw err;
    }
  }

  if (isDir) {
    for (const child of await entry.children()) {
      yield* await walkEntriesDownToTop(child);
    }
  }

  yield entry;
}

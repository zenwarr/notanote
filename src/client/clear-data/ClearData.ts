import { runParallelWithoutFailures } from "@common/utils/parallel";
import { DEFAULT_FS_IDB_DATABASE } from "../storage/IdbKvStorage";


export async function clearData() {
  if (!confirm(`Are you sure you want to delete local data? It is going to delete:
  
- All local changes not synced to the remote storage
- All cached data

It is not going to delete:

- Data on remote storage`)) {
    return;
  }

  async function deleteDatabase(name: string): Promise<void> {
    const req = indexedDB.deleteDatabase(name);
    return new Promise<void>((resolve, reject) => {
      req.onsuccess = () => resolve();
      req.onerror = reject;
      req.onblocked = () => reject(new Error("Cannot delete database while it is blocked"));
    });
  }

  const errors = await runParallelWithoutFailures(
      deleteDatabase("keyval-store"),
      deleteDatabase(DEFAULT_FS_IDB_DATABASE),
      clearCaches()
  );

  if (errors.some(e => e != null)) {
    alert(`There were errors deleting data:\n\n${ errors.join("\n") }`);
  } else {
    alert("Data cleared. The page is going to reload now.");
    document.location.reload();
  }
}


async function clearCaches() {
  for (const key of await caches.keys()) {
    await caches.delete(key);
  }
}

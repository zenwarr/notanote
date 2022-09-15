import { StorageEntryPointer, StorageEntryStats } from "@storage/EntryStorage";


export async function getSafeStats(sp: StorageEntryPointer): Promise<StorageEntryStats | undefined> {
  try {
    return await sp.stats();
  } catch (err: any) {
    return undefined;
  }
}

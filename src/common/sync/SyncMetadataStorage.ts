import { StoragePath } from "../storage/StoragePath";
import { ContentIdentity } from "./ContentIdentity";


// todo: we should remove metadata for keys missing both in the local and remote storage
// because sync does not know about them
// but if another file with the same name is going to be added to local storage later, we will get incorrect sync metadata for it
export interface SyncMetadataStorage {
  get(path: StoragePath): Promise<ContentIdentity | undefined>;

  set(path: StoragePath, identity: ContentIdentity | undefined): Promise<void>;

  setMulti(data: SyncMetadataMap): Promise<void>;
}


export type SyncMetadataMap = { [path: string]: ContentIdentity | undefined };

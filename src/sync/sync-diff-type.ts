export enum SyncDiffType {
  LocalCreate = "local_create",
  RemoteCreate = "remote_create",
  ConflictingCreate = "conflicting_create",
  LocalUpdate = "local_update",
  RemoteUpdate = "remote_update",
  ConflictingUpdate = "conflicting_update",
  LocalRemove = "local_remove",
  RemoteRemove = "remote_remove",
  ConflictingLocalRemove = "conflicting_local_remove",
  ConflictingRemoteRemove = "conflicting_remote_remove",
}


export function isConflictingDiff(diff: SyncDiffType): boolean {
  const conflictingTypes: SyncDiffType[] = [
    SyncDiffType.ConflictingCreate,
    SyncDiffType.ConflictingUpdate,
    SyncDiffType.ConflictingLocalRemove,
    SyncDiffType.ConflictingRemoteRemove,
  ];

  return conflictingTypes.includes(diff);
}


export function isCleanLocalDiff(diff: SyncDiffType): boolean {
  const localTypes: SyncDiffType[] = [
    SyncDiffType.LocalUpdate,
    SyncDiffType.LocalRemove,
    SyncDiffType.LocalCreate,
  ];

  return localTypes.includes(diff);
}


export function isCleanRemoteDiff(diff: SyncDiffType): boolean {
  const cleanRemoteTypes: SyncDiffType[] = [
    SyncDiffType.RemoteCreate,
    SyncDiffType.RemoteUpdate,
    SyncDiffType.RemoteRemove,
  ];

  return cleanRemoteTypes.includes(diff);
}

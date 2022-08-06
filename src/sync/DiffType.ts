export enum DiffType {
  LocalUpdate = "iu",
  RemoteUpdate = "ru",
  ConflictingUpdate = "cu",

  LocalCreate = "lc",
  RemoteCreate = "rc",
  ConflictingCreate = "cc",

  LocalRemove = "lr",
  ConflictingLocalRemove = "clr",
  RemoteRemove = "rr",
  ConflictingRemoteRemove = "crr",
}

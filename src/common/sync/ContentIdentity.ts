import * as crypto from "crypto";
import { StorageEntryPointer, StorageEntrySize, StorageError, StorageErrorCode } from "../storage/StorageLayer";


export interface ContentIdentity {
  hash: string | undefined;
  size: StorageEntrySize;
}


export const DirContentIdentity = { hash: undefined, size: 0 };
Object.freeze(DirContentIdentity);


export function isDirIdentity(identity: ContentIdentity | undefined) {
  return identity && identity.hash === DirContentIdentity.hash && identity.size === DirContentIdentity.size;
}


export function isContentIdentityEqual(a: ContentIdentity, b: ContentIdentity): boolean {
  if (a.hash !== b.hash) {
    return false;
  }

  if (typeof a.size === "number" && typeof b.size === "number" && a.size !== b.size) {
    return false;
  }

  return true;
}


/**
 * Calculates the content identity of a storage entry.
 * Content identity is undefined if given entry does not exist.
 */
export async function getContentIdentity(ep: StorageEntryPointer, content: string | Buffer | undefined = undefined): Promise<ContentIdentity | undefined> {
  let size: number | "unk" | undefined;
  let isDir = false;

  try {
    const stats = await ep.stats();
    isDir = stats.isDirectory;
    size = stats.size;
  } catch (err: unknown) {
    if (err instanceof StorageError && err.code === StorageErrorCode.NotExists) {
      return undefined;
    } else {
      throw err;
    }
  }

  if (isDir) {
    return DirContentIdentity;
  }

  if (content == null && !isDir) {
    content = await readEntityTextIfAny(ep);
  }

  // todo: should we calculate hash based on binary or text content? in the former case, how to deal with storages not supporting binary content?
  return {
    hash: getContentHash(content),
    size: size,
  };
}


export async function readEntityTextIfAny(e: StorageEntryPointer): Promise<string | undefined> {
  try {
    return await e.readText();
  } catch (err: unknown) {
    if (err instanceof StorageError && (err.code === StorageErrorCode.NotFile || err.code === StorageErrorCode.NotExists)) {
      return undefined;
    } else {
      throw err;
    }
  }
}


export function getContentHash(input: string | Buffer | undefined): string {
  if (input === undefined) {
    return "";
  }

  return crypto.createHash("sha256").update(input).digest("hex");
}

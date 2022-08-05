import * as crypto from "crypto";
import { StorageEntryPointer, StorageError, StorageErrorCode } from "@storage/StorageLayer";


export type ContentIdentity = string;


export const DirContentIdentity = "d";


export function isDirIdentity(identity: ContentIdentity | undefined) {
  return identity && identity === DirContentIdentity;
}


export function isContentIdentityEqual(a: ContentIdentity, b: ContentIdentity): boolean {
  return a === b;
}


/**
 * Calculates the content identity of a storage entry.
 * Content identity is undefined if given entry does not exist.
 */
export async function getContentIdentity(ep: StorageEntryPointer, content: Buffer | undefined = undefined): Promise<ContentIdentity | undefined> {
  let isDir = false;

  try {
    const stats = await ep.stats();
    isDir = stats.isDirectory;
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
    content = await readEntityDataIfAny(ep);
  }

  return "t" + getContentHash(content);
}


export async function readEntityDataIfAny(e: StorageEntryPointer): Promise<Buffer | undefined> {
  try {
    return await e.read();
  } catch (err: unknown) {
    if (err instanceof StorageError && (err.code === StorageErrorCode.NotFile || err.code === StorageErrorCode.NotExists)) {
      return undefined;
    } else {
      throw err;
    }
  }
}


export function getContentHash(input: Buffer | undefined): string {
  if (input === undefined) {
    return "";
  }

  return crypto.createHash("sha256").update(input).digest("hex");
}

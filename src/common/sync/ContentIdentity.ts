import * as crypto from "crypto";
import { StorageEntryPointer, StorageError, StorageErrorCode } from "../storage/StorageLayer";


export interface ContentIdentity {
  hash: string | undefined;
  size: number | "unk" | undefined;
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


export async function getContentIdentity(e: StorageEntryPointer, content: string | Buffer | undefined = undefined): Promise<ContentIdentity | undefined> {
  let size: number | "unk" | undefined;
  let isDir = false;
  try {
    const stats = await e.stats();
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
    return { hash: undefined, size: 0 };
  }

  if (content == null && !isDir) {
    content = await readTextIfAny(e);
  }

  return {
    hash: getContentHash(content),
    size: size,
  };
}


async function readTextIfAny(e: StorageEntryPointer): Promise<string | undefined> {
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

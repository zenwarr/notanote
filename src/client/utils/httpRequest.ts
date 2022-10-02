import * as ky from "ky";
import kyDefault from "ky";
import { LogicError } from "@common/errors";
import { StorageError } from "@storage/EntryStorage";
import { StoragePath } from "@storage/StoragePath";


export async function httpRequest(url: string, options: ky.Options): Promise<Response> {
  const r = await kyDefault(url, {
    ...options,
    throwHttpErrors: false
  });

  if (r.ok) {
    return r;
  }

  const reply: any = await r.json();
  if (!reply || typeof reply !== "object") {
    throw new Error("Network error: " + r.statusText);
  }

  const cl = typeof reply.class === "string" ? reply.class : undefined;
  const msg = typeof reply.error === "string" ? reply.error : undefined;
  const code = typeof reply.code === "string" ? reply.code : undefined;
  const path = typeof reply.path === "string" ? reply.path : undefined;

  if (cl === "StorageError" && msg && code && path) {
    throw new StorageError(code, new StoragePath(reply.path), msg);
  } else if (cl === "LogicError" && msg && code) {
    throw new LogicError(msg, code);
  } else if (msg) {
    throw new Error(msg);
  } else {
    throw new Error("Network error: " + r.statusText);
  }
}

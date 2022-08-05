import path from "path";
import p from "path";


export class StoragePath {
  constructor(path: string) {
    this._normalized = normalize(path);
  }


  get normalized(): string {
    return this._normalized;
  }


  get basename(): string {
    return p.basename(this._normalized);
  }


  child(childPath: string): StoragePath {
    return new StoragePath(p.join(this._normalized, childPath));
  }


  get parentDir(): StoragePath {
    return new StoragePath(p.dirname(this._normalized));
  }


  valueOf(): string {
    return this._normalized;
  }


  isEqual(other: StoragePath): boolean {
    return this._normalized === other._normalized;
  }


  get parts(): string[] {
    return this._normalized.split("/").filter(x => !!x);
  }


  inside(other: StoragePath, includeSelf = true): boolean {
    const includes = other._normalized === "/" || this._normalized.startsWith(other._normalized + "/");
    return includes || (includeSelf && this.isEqual(other));
  }



  static root = new StoragePath("/");


  private readonly _normalized: string;
}


function normalize(path: string): string {
  path = path.trim();
  path = p.normalize(path);
  path = path.replace(/\\/g, "/");
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  if (path.endsWith("/") && path !== "/") {
    path = path.substring(0, path.length - 1);
  }

  return path;
}


export function joinNestedPathSecure(root: string, nested: string): string | undefined {
  if (nested.indexOf("\0") >= 0) {
    return undefined;
  }

  if (!root.endsWith(path.sep)) {
    root = root + path.sep;
  }

  const result = path.join(root, nested);
  if (!isPathInsideRoot(root, result)) {
    return undefined;
  }

  return result;
}


export function addEndingPathSlash(p: string) {
  return p.endsWith(path.sep) ? p : p + path.sep;
}


export function isPathInsideRoot(root: string, nested: string): boolean {
  if (addEndingPathSlash(root) === addEndingPathSlash(nested)) {
    return true;
  }

  return nested.startsWith(addEndingPathSlash(root));
}

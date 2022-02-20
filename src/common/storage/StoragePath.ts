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

  return path;
}

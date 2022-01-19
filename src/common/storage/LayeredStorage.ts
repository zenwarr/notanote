import { StorageLayer, StorageEntry, StorageEntryFlag, StorageLayerFlag } from "./StorageLayer";
import * as p from "path";
import { StoragePath } from "./StoragePath";


export class LayeredStorage {
  constructor(private layers: StorageLayer[]) {

  }


  async get(path: StoragePath): Promise<StorageEntry | undefined> {
    const mounted = this.mounts.get(path.path);
    if (mounted) {
      return mounted;
    }

    for (const layer of this.layers) {
      const entry = await layer.get(path);
      if (entry && entry.flags() & StorageEntryFlag.Removed) {
        return undefined;
      } else if (entry) {
        return entry;
      }
    }

    return undefined;
  }


  async list(path: StoragePath): Promise<StorageEntry[] | undefined> {
    const result: StorageEntry[] = [];

    for (let q = this.layers.length - 1; q >= 0; --q) {
      const layer = this.layers[q]!;

      const entries = await layer.list(path);
      if (entries) {
        mergeFsLayerEntries(result, entries);
      }
    }

    const mountedEntries: StorageEntry[] = [];
    for (const [ mpath, mounted ] of this.mounts.entries()) {
      if (p.dirname(mpath) === path.path) {
        mountedEntries.push(mounted);
      }
    }

    mergeFsLayerEntries(result, mountedEntries);

    return result;
  }


  async remove(path: StoragePath): Promise<void> {
    const layer = this.getWritableLayer();
    if (!layer) {
      throw new Error("No writable layer found");
    }

    await layer.remove(path);
  }


  async readText(path: StoragePath): Promise<string | undefined> {
    const entry = await this.get(path);
    if (!entry) {
      return undefined;
    }

    return entry.readText();
  }


  async write(path: StoragePath, content: Buffer | string): Promise<StorageEntry> {
    const mounted = this.mounts.get(path.path);
    if (mounted) {
      await mounted.write(content);
      return mounted;
    }

    const layer = this.getWritableLayer();
    if (!layer) {
      throw new Error("No writable layer found");
    }

    return layer.write(path, content);
  }


  async createDir(path: StoragePath): Promise<StorageEntry> {
    const layer = this.getWritableLayer();
    if (!layer) {
      throw new Error("No writable layer found");
    }

    return layer.createDir(path);
  }


  mount(entry: StorageEntry) {
    const path = entry.getPath().path;
    if (this.mounts.has(path)) {
      throw new Error(`Path '${ path }' is already mounted`);
    }

    this.mounts.set(path, entry);
  }


  private getWritableLayer(): StorageLayer | undefined {
    for (const layer of this.layers) {
      if (layer.flags() & StorageLayerFlag.Writable) {
        return layer;
      }
    }

    return undefined;
  }


  private mounts = new Map<string, StorageEntry>();
}


function mergeFsLayerEntries(into: StorageEntry[], from: StorageEntry[]) {
  for (const entry of from) {
    const existing = into.find(e => e.getPath().path === entry.getPath().path);
    if (existing) {
      if (entry.flags() & StorageEntryFlag.Removed) {
        into.splice(into.indexOf(existing), 1);
      } else {
        into.splice(into.indexOf(existing), 1, entry);
      }
    } else {
      into.push(entry);
    }
  }
}

import { EntryStorage, StorageError, StorageErrorCode } from "@storage/entry-storage";
import { StoragePath } from "@storage/storage-path";


export async function resolveImport(storage: EntryStorage, from: StoragePath, imp: string, options: {
  extensions: string[]
}): Promise<StoragePath | undefined> {
  // if path starts with a dot, it's a relative import
  if (imp.startsWith("./") || imp.startsWith("../")) {
    const resolved = from.parentDir.child(imp);

    if (resolved.extension) {
      return await storage.exists(resolved) ? resolved : undefined;
    } else {
      try {
        const stat = await storage.stats(resolved);
        if (stat.isDirectory) {
          for (const ext of options.extensions) {
            const path = resolved.child(`index.${ ext }`);
            if (await storage.exists(path)) {
              return path;
            }
          }

          // no index file found, it still can be import from a file with same name as existing directory
        }
      } catch (err) {
        if (err instanceof StorageError && err.code === StorageErrorCode.NotExists) {
          // do nothing, it can be a file without extension
        } else {
          throw err;
        }
      }

      for (const ext of options.extensions) {
        const withExt = new StoragePath(resolved.normalized + "." + ext);
        if (await storage.exists(withExt)) {
          return withExt;
        }
      }

      return undefined;
    }
  } else {
    const pkgDir = await getPackageDir(storage, from, imp);
    if (!pkgDir) {
      return undefined;
    }

    const manifest = await getManifest(storage, pkgDir);
    const resolved = pkgDir.child(manifest?.main ?? "index.js");

    return await storage.exists(resolved) ? resolved : undefined;
  }
}


async function getManifest(storage: EntryStorage, packageDir: StoragePath) {
  const manifestPath = packageDir.child("package.json");

  try {
    const manifest = await storage.read(manifestPath);
    return JSON.parse(manifest.toString());
  } catch (err) {
    return undefined;
  }
}


async function getPackageDir(storage: EntryStorage, from: StoragePath, packageName: string) {
  let currentDir = from.parentDir;
  while (!currentDir.isEqual(StoragePath.root)) {
    const nodeModules = currentDir.child("node_modules");
    if (!await storage.exists(nodeModules)) {
      currentDir = currentDir.parentDir;
      continue;
    }

    const packageDir = nodeModules.child(packageName);
    if (await storage.exists(packageDir)) {
      return packageDir;
    }

    currentDir = currentDir.parentDir;
  }

  return undefined;
}

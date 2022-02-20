import webpack from "webpack";
import * as path from "path";
import * as crypto from "crypto";
import * as os from "os";
import * as fs from "fs";
import * as _ from "lodash";
import { RemotePluginSpec } from "../../common/plugin";
import { clone, pullChanges, runCommand } from "../github/Github";
import { SpecialWorkspaceEntry } from "../../common/workspace/Workspace";
import { ErrorCode, LogicError } from "../../common/errors";


const cssExtract = require("mini-css-extract-plugin");


export interface PluginBuildResult {
  entryPointPath: string;
}


export interface PluginBuildDirs {
  buildDir: string;
  cacheDir: string;
}


export async function buildStoragePlugin(storageRoot: string, pluginId: string): Promise<PluginBuildResult> {
  const pluginDir = path.join(storageRoot, SpecialWorkspaceEntry.Plugins.normalized, pluginId);
  const buildDirs = getBuildDirs(storageRoot, pluginId);
  return buildPlugin(pluginDir, pluginId, buildDirs);
}


export async function updatePlugin(storageRoot: string, pluginId: string): Promise<void> {
  const pluginDir = path.join(storageRoot, SpecialWorkspaceEntry.Plugins.normalized, pluginId);
  console.log("Pulling changes from remote repository...");
  await pullChanges(pluginDir);
}


export async function clonePlugin(storageRoot: string, pluginId: string, cloneUrl: string): Promise<void> {
  const pluginDir = path.join(storageRoot, SpecialWorkspaceEntry.Plugins.normalized, pluginId);
  if (await asyncExists(pluginDir)) {
    throw new LogicError(ErrorCode.AlreadyExists, `Plugin "${ pluginId }" already exists`);
  }

  await clone(storageRoot, cloneUrl, pluginDir);
}


export function getBuildDirs(storagePath: string, pluginId: string): PluginBuildDirs {
  const hashInput = [ storagePath, pluginId ].join("::");
  const hash = crypto.createHash("sha1").update(hashInput).digest("hex");
  return {
    buildDir: path.join(os.tmpdir(), "notanote-plugin-build", hash),
    cacheDir: path.join(os.tmpdir(), "notanote-plugin-build-cache", hash)
  };
}


export async function buildPlugin(pluginDir: string, pluginId: string, buildDirs: PluginBuildDirs): Promise<PluginBuildResult> {
  const buildEntryPoint = path.join(buildDirs.buildDir, "index.js");

  const sourceModifyHash = await getDirModifyHash(pluginDir);
  const buildModifyHash = await getBuildModifyHash(buildDirs.buildDir);
  if (sourceModifyHash === buildModifyHash) {
    return {
      entryPointPath: buildEntryPoint
    };
  }

  console.log("Rebuilding plugin...");
  if (await asyncExists(path.join(pluginDir, "yarn.lock"))) {
    await runCommand("yarn", [ "install", "--frozen-lockfile" ], { cwd: pluginDir });
  }

  const entryPoint = await getFirstExistingFile([ "index.tsx", "index.ts", "index.jsx", "index.js" ].map(f => path.join(pluginDir, f)));

  return new Promise((resolve, reject) => {
    webpack({
      entry: entryPoint,
      output: {
        filename: "index.js",
        path: buildDirs.buildDir,
        library: {
          type: "assign",
          name: `plugin_${ pluginId }`
        }
      },
      target: "web",
      mode: "production",
      resolve: {
        extensions: [ ".ts", ".tsx", ".js", ".jsx", ".json" ],
        fallback: {
          path: require.resolve("path-browserify")
        }
      },

      module: {
        rules: [
          {
            test: /\.tsx?$/,
            loader: "ts-loader",
            options: {
              configFile: path.join(__dirname, "plugin-tsconfig.json"),
              context: pluginDir
            }
          },
          {
            test: /\.(js|jsx)$/,
            exclude: /nodeModules/,
            loader: "babel-loader",
            options: {
              presets: [
                "@babel/preset-env",
                "@babel/preset-react"
              ]
            }
          },
          {
            test: /\.css$/,
            use: [
              { loader: cssExtract.loader },
              "css-loader"
            ]
          }
        ]
      },

      cache: {
        type: "filesystem",
        cacheDirectory: buildDirs.cacheDir
      },

      externals: {
        "react": "React",
        "mobx": "Mobx",
        "mobx-react-lite": "MobxReactLite",
        "date-fns": "DateFns",
        "@mui/material": "MaterialUI",
        "csv": "CSV"
      },

      plugins: [
        new cssExtract({
          filename: `index.css`
        })
      ]
    }, async (err, stats) => {
      if (err || stats?.hasErrors()) {
        if (stats) {
          const report = (stats.toJson().errors || []).map(formatError).join("\n");
          reject(new Error(report));
        } else {
          reject(err);
        }
      } else {
        await setBuildMeta(buildDirs.buildDir, {
          modifyHash: sourceModifyHash
        });
        resolve({ entryPointPath: buildEntryPoint });
      }
    });
  });
}


function formatError(e: webpack.StatsError): string {
  return e.message + "\n" + e.details + "\n" + e.stack;
}


export async function getDirModifyHash(dir: string): Promise<string> {
  const entries = await walkDirRecursive(dir);

  const hash = crypto.createHash("sha1");
  for (const entry of entries) {
    hash.update(`${ entry.path }::${ entry.stat.mtime.getTime() }`);
  }

  return hash.digest("hex");
}


async function walkDirRecursive(dir: string): Promise<{ path: string, stat: fs.Stats }[]> {
  const files = await fs.promises.readdir(dir);

  const promises = files.map(async file => {
    const filePath = path.join(dir, file);
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      return walkDirRecursive(filePath);
    } else {
      return { path: filePath, stat };
    }
  });

  return _.flattenDeep(await Promise.all(promises));
}


async function getBuildModifyHash(buildDir: string): Promise<string | undefined> {
  try {
    const buildInfo = JSON.parse(await fs.promises.readFile(path.join(buildDir, "build.json"), "utf8"));
    return buildInfo.modifyHash;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return undefined;
    } else {
      throw err;
    }
  }
}


async function setBuildMeta(buildDir: string, meta: any): Promise<void> {
  await fs.promises.writeFile(path.join(buildDir, "build.json"), JSON.stringify(meta));
}


async function getFirstExistingFile(files: string[]) {
  for (const file of files) {
    if (await asyncExists(file)) {
      return file;
    }
  }

  return undefined;
}


export async function asyncExists(file: string) {
  try {
    await fs.promises.access(file);
    return true;
  } catch (err) {
    return false;
  }
}


export async function getWorkspacePlugins(storageId: string, realRootPath: string): Promise<RemotePluginSpec[]> {
  try {
    const pluginDirs = await fs.promises.readdir(path.join(realRootPath, ".note/plugins"));
    return (await Promise.all(pluginDirs.map(async pluginDir => {
      const pluginId = path.basename(pluginDir);
      return await getPluginSpec(storageId, pluginId, path.join(realRootPath, ".note/plugins", pluginDir));
    }))).filter(x => x != null) as RemotePluginSpec[];
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return [];
    } else {
      throw err;
    }
  }
}


async function getPluginSpec(wsId: string, pluginId: string, dir: string): Promise<RemotePluginSpec | undefined> {
  const metaFile = path.join(dir, "plugin.json");

  try {
    const meta = JSON.parse(await fs.promises.readFile(metaFile, "utf8"));
    return {
      name: pluginId,
      url: `/api/storages/${ encodeURIComponent(wsId) }/plugins/${ encodeURIComponent(pluginId) }`,
      editors: meta.editors
    };
  } catch (err: any) {
    console.error(`Failed to load plugin ${ pluginId }: ${ err.message }`);
    return undefined;
  }
}

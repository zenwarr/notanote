import { RuntimeStorageEntry } from "../../common/storage/RuntimeStorageEntry";


const DEVICE_CONFIG_KEY = "nuclear-device-config";


export enum StorageConnectionType {
  Network = "network",
  BrowserFs = "browser-fs"
}


export interface StorageConnectionConfig {
  type: StorageConnectionType;
  location?: string;
}


export interface DeviceConfig {
  remote?: StorageConnectionConfig;
  local?: StorageConnectionConfig;
}


export class DeviceConfigStorageEntry extends RuntimeStorageEntry {
  override async readText(): Promise<string> {
    try {
      return JSON.stringify(getDeviceConfig(), null, 2);
    } catch (error) {
      return JSON.stringify({}, null, 2);
    }
  }


  override async writeOrCreate(content: Buffer | string) {
    if (typeof content !== "string") {
      throw new Error("DeviceConfigStorageEntry: writeOrCreate: content must be a string");
    }

    localStorage.setItem(DEVICE_CONFIG_KEY, content);
  }
}


export function getDeviceConfig(): DeviceConfig {
  const config = JSON.parse(localStorage.getItem(DEVICE_CONFIG_KEY) || "{}");
  if (config == null || typeof config !== "object") {
    return {
      remote: getDefaultRemoteStorage()
    };
  }

  return {
    remote: config.remote ? {
      type: config.remote.type,
      location: config.remote.location,
    } : getDefaultRemoteStorage(),
    local: config.local ? {
      type: config.local.type,
      location: config.local.location,
    } : undefined,
  };
}


function getDefaultRemoteStorage(): StorageConnectionConfig {
  return {
    type: StorageConnectionType.Network,
    location: document.location.origin,
  };
}

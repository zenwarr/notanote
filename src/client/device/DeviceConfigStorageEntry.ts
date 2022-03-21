import { RuntimeStorageEntry } from "../../common/storage/RuntimeStorageEntry";


const DEVICE_CONFIG_KEY = "nuclear-device-config";


export class DeviceConfigStorageEntry extends RuntimeStorageEntry {
  override async readText(): Promise<string> {
    try {
      const config = JSON.parse(localStorage.getItem(DEVICE_CONFIG_KEY) || "{}");
      return JSON.stringify(config, null, 2);
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

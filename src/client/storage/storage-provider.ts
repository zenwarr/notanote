import { EntryStorage } from "@storage/entry-storage";
import { SyncTargetProvider } from "@sync/sync-target-provider";
import * as React from "react";


export interface StorageConnectionConfig {
  provider: string;
  options?: unknown;
}


export interface StorageConfig {
  remote?: StorageConnectionConfig;
  local?: StorageConnectionConfig;
}


export interface StorageProvider<TOptions = unknown> {
  name: string;
  title: string;
  storageFactory?: (options: TOptions) => EntryStorage;
  syncFactory?: (options: TOptions) => SyncTargetProvider;
  configEditor: React.ComponentType<StorageProviderConfigEditorProps<TOptions>>;
  validateOptions: (options: unknown) => Promise<string | undefined>;
  validateStartupOptions?: (options: unknown) => Promise<string | undefined>;
}


export type StorageProviderConfigEditorProps<T> = {
  config: T | undefined;
  onChange?: (config: Partial<T>) => void;
}


export class StorageProviderManager {
  registerProvider<T>(provider: StorageProvider<T>) {
    if (this.providers.some(p => p.name === provider.name)) {
      throw new Error(`Provider ${ provider.name } already registered`);
    }

    this.providers.push(provider as StorageProvider);
  }


  getProvider(name: string): StorageProvider | undefined {
    return this.providers.find(p => p.name === name);
  }


  getProviders(): StorageProvider[] {
    return this.providers;
  }


  getStorageConfig(): StorageConfig | undefined {
    const data = localStorage.getItem("storageConfig");
    if (!data) {
      return undefined
    }

    return JSON.parse(data);
  }


  setStorageConfig(config: StorageConfig): void {
    localStorage.setItem("storageConfig", JSON.stringify(config));
  }


  static readonly instance = new StorageProviderManager();


  private readonly providers: StorageProvider[] = [];
}

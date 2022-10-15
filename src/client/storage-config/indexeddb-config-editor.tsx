import * as React from "react";
import { Box, Button, TextField } from "@mui/material";
import { KVEntryStorage } from "@storage/kv-entry-storage";
import { IdbKvStorage } from "../storage/idb-kv-storage";
import { StorageProviderConfigEditorProps, StorageProviderManager } from "../storage/storage-provider";


interface IndexedDbStorageConfig {
  dbName: string;
}


function IndexedDbConfigEditor(props: StorageProviderConfigEditorProps<IndexedDbStorageConfig>) {
  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    props.onChange?.({
      ...props.config,
      dbName: e.target.value
    });
  }

  return <TextField name="dbName" label={ "IndexedDB database name (leave empty for default)" } value={ props.config?.dbName || "" }
                    onChange={ onChange } fullWidth/>;
}


export function registerIndexedDbStorageProvider() {
  StorageProviderManager.instance.registerProvider<IndexedDbStorageConfig | undefined>({
    name: "indexeddb",
    title: "IndexedDB",
    storageFactory: c => new KVEntryStorage(new IdbKvStorage(c?.dbName || undefined)),
    configEditor: IndexedDbConfigEditor,
    validateOptions: async () => undefined
  });
}

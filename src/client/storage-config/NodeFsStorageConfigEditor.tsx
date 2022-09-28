import { FsStorage } from "@storage/FsStorage";
import { Button, Stack } from "@mui/material";
import { StorageProviderConfigEditorProps, StorageProviderManager } from "../storage/StorageProvider";
import { useState } from "react";


declare global {
  const chooseDirectory: () => Promise<{ cancelled: boolean, filePaths: string[] }>;
}


interface NodeFsStorageConfig {
  path: string;
}


export function NodeFsConfigEditor(props: StorageProviderConfigEditorProps<NodeFsStorageConfig>) {
  const [ selecting, setSelecting ] = useState(false);

  async function onClick() {
    setSelecting(true);
    try {
      const r = await chooseDirectory();
      if (r.cancelled || r.filePaths.length < 1) {
        return;
      }

      props.onChange?.({
        path: r.filePaths[0]
      });
    } finally {
      setSelecting(false);
    }
  }

  return <Stack direction={ "row" } spacing={ 2 }>
    <span>Selected path: { props.config?.path || "" }</span>
    <Button variant={ "outlined" } size={ "small" } onClick={ onClick } disabled={ selecting }>
      Select
    </Button>
  </Stack>;
}


export function registerNodeFsStorageProvider() {
  StorageProviderManager.instance.registerProvider<NodeFsStorageConfig>({
    name: "node-fs",
    title: "File system",
    storageFactory: c => new FsStorage(c.path),
    configEditor: NodeFsConfigEditor,
    validateOptions: async (options: any) => {
      if (!options || typeof options != "object") {
        return "Invalid options object";
      }

      if (!options.path || typeof options.path !== "string") {
        return "Path is required";
      }

      return undefined;
    }
  });
}

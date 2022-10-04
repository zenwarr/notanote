import { Stack, Box } from "@mui/material";
import { StoragePath } from "@storage/storage-path";
import { SyncDiffType } from "@sync/Sync";
import { SyncDiffEntry } from "@sync/SyncDiffEntry";
import { DiffAction } from "@sync/SyncMetadataStorage";
import { useEffect, useState } from "react";
import { App } from "../App";
import { AudioRecord } from "../audio/AudioRecord";
import { ErrorDisplay } from "../error-boundary/ErrorDisplay";
import { Palette } from "../palette/Palette";
import { processScriptText } from "../plugin/PluginManager";
import { AppConfigurationGuard } from "../storage-config/AppConfigurationGuard";
import { StorageConfigView } from "../storage-config/StorageConfigView";
import { StorageConfig } from "../storage/StorageProvider";
import { DiffCompare } from "../sync/DiffCompare";
import { DiffTreeNode } from "../sync/DiffTreeNode";
import { SyncStatus } from "../sync/SyncStatusConnected";
import { demoCompleter } from "./demo";


export default { title: "App" };

export const def = () => <AppConfigurationGuard/>;

export const palette = () => <Palette open completer={ demoCompleter } onSelect={ console.log }/>;

export const audio = () => <AudioRecord/>;

export const error = () => <ErrorDisplay error={ new Error("Something bad") }/>;

function createDiff(diff: SyncDiffType, accepted = false): SyncDiffEntry {
  return {
    path: new StoragePath("demo"),
    diff,
    actual: "actual",
    remote: "remote",
    syncMetadata: {
      synced: "synced",
      accepted: accepted ? "actual" : "accepted",
      action: accepted ? DiffAction.AcceptAuto : undefined,
      diff
    }
  };
}

export const diff = () => <Stack direction={ "row" } spacing={ 2 }>
  <Stack p={ 2 } spacing={ 2 }>
    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.LocalCreate) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.LocalUpdate) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.LocalRemove) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.RemoteCreate) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.RemoteUpdate) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.RemoteRemove) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingCreate) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingUpdate) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingLocalRemove) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingRemoteRemove) }/>
  </Stack>

  <Stack p={ 2 } spacing={ 2 }>
    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.LocalCreate, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.LocalUpdate, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.LocalRemove, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.RemoteCreate, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.RemoteUpdate, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.RemoteRemove, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingCreate, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingUpdate, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingLocalRemove, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingRemoteRemove, true) }/>
  </Stack>
</Stack>;


export const diffCompare = () => <DiffCompare
    diffType={ SyncDiffType.ConflictingUpdate }
    data={ { local: Buffer.from("Hello, world"), remote: Buffer.from("Hello, world! remote") } }/>;


export function StorageConfigTest() {
  const [ config, setConfig ] = useState<StorageConfig | undefined>();

  return <Box p={ 2 }>
    <StorageConfigView initialConfig={ config } onApply={ config => {
      alert(JSON.stringify(config));
      setConfig(config);
    }
    }/>
  </Box>;
}


export const syncStatus = () => <SyncStatus isError={ false } cleanDiffCount={ 1 } conflictCount={ 2 } isWorking={ false }/>;


export const Script = () => {
  const [ compiled, setCompiled ] = useState("");

  useEffect(() => {
    (async () => {
      const r = await processScriptText("index.tsx", `
      import * as React from "react";
      console.log(React.render);
      export const X = { a: "b" };
      `, true);
      setCompiled(r.code);
      console.log("imported: ", r.imports);
    })();
  }, []);

  return <pre>
    { compiled }
  </pre>;
};

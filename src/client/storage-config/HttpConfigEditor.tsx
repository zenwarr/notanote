import { TextField, Box, Grid } from "@mui/material";
import * as React from "react";
import { HttpSyncProvider } from "../storage/HttpSyncProvider";
import { StorageProviderConfigEditorProps, StorageProviderManager } from "../storage/StorageProvider";
import { HttpLoginStatus, requestUserProfile } from "./HttpLoginStatus";


interface HttpStorageConfig {
  server: string;
  storageName?: string;
}


function HttpConfigEditor(props: StorageProviderConfigEditorProps<HttpStorageConfig>) {
  function onServerUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    props.onChange?.({
      ...props.config,
      server: e.target.value
    });
  }

  function onStorageNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    props.onChange?.({
      ...props.config,
      storageName: e.target.value
    });
  }

  return <>
    <Grid container spacing={ 2 }>
      <Grid item md={ 6 } xs={ 12 }>
        <TextField name={ "server" } label={ "Server URL" } value={ props.config?.server || "" } onChange={ onServerUrlChange } fullWidth/>
      </Grid>

      <Grid item md={ 6 } xs={ 12 }>
        <TextField name="storageName" label={ "Storage name (leave empty for default)" } value={ props.config?.storageName || "" }
                   onChange={ onStorageNameChange } fullWidth/>
      </Grid>
    </Grid>

    {
        props.config?.server && <Box mt={ 2 } mb={ 2 }>
        <HttpLoginStatus server={ props.config.server }/>
      </Box>
    }
  </>;
}


export function registerHttpStorageProvider() {
  StorageProviderManager.instance.registerProvider<HttpStorageConfig>({
    name: "http",
    title: "HTTP",
    syncFactory: c => new HttpSyncProvider(c.server, c.storageName || undefined),
    configEditor: HttpConfigEditor,
    validateOptions: async o => validateOptions(o, true),
    validateStartupOptions: async o=> validateOptions(o, false)
  });
}


async function validateOptions(options: any, checkAuth: boolean): Promise<string | undefined> {
  if (!options || typeof options != "object") {
    return "Invalid options object";
  }

  if (!options.server || typeof options.server !== "string") {
    return "Server URL is required";
  }

  if (checkAuth) {
    try {
      const profile = await requestUserProfile(options.server);
      return profile != null ? undefined : "User is not authorized";
    } catch (e: any) {
      throw new Error(`Error connecting to backend at ${ options.server }: ${ e.message }`);
    }
  }

  return undefined
}

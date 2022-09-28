import { Alert, Box, Button, Divider } from "@mui/material";
import { useState } from "react";
import { StorageConfig, StorageConnectionConfig, StorageProviderManager } from "../storage/StorageProvider";
import { StorageConnectionView } from "./StorageConnectionView";


export type StorageConfigProps = {
  initialConfig: StorageConfig | undefined;
  onApply?: (config: StorageConfig) => void;
}


export function StorageConfigView(props: StorageConfigProps) {
  const [ config, setConfig ] = useState(props.initialConfig);
  const [ commonError, setCommonError ] = useState<string | undefined>();
  const [ localError, setLocalError ] = useState<string | undefined>();
  const [ remoteError, setRemoteError ] = useState<string | undefined>();
  const [ submitting, setSubmitting ] = useState(false);

  function onChange(isRemote: boolean, updated: StorageConnectionConfig) {
    setConfig({
      ...config,
      [isRemote ? "remote" : "local"]: updated
    });
  }

  async function apply() {
    if (!config) {
      setCommonError("Storages not configured");
      return;
    }

    setSubmitting(true);
    setCommonError(undefined);
    setLocalError(undefined);
    setRemoteError(undefined);

    try {
      const [ remoteError, localError ] = await Promise.all([
        validate(config.remote, false),
        validate(config.local)
      ]);

      if (remoteError) setRemoteError(remoteError);
      if (localError) setLocalError(localError);

      if (!remoteError && !localError) {
        props.onApply?.(config);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return <div>
    <h1>Remote</h1>

    { remoteError && <Box mb={ 2 }><Alert severity={ "error" }>{ remoteError }</Alert></Box> }

    <StorageConnectionView config={ config?.remote } onChange={ onChange.bind(null, true) } isRemote/>

    <Divider/>

    <h1>Local</h1>

    { localError && <Box mb={ 2 }><Alert severity={ "error" }>{ localError }</Alert></Box> }

    <StorageConnectionView config={ config?.local } onChange={ onChange.bind(null, false) } isRemote={ false }/>

    { commonError && <Box mb={ 2 }><Alert severity={ "error" }>{ commonError }</Alert></Box> }

    <Box mt={ 2 } display={ "flex" } justifyContent={ "center" }>
      <Button variant={ "contained" } size={ "small" } onClick={ apply } disabled={ submitting }>
        Apply configuration
      </Button>
    </Box>
  </div>;
}


async function validate(config: StorageConnectionConfig | undefined, required = true): Promise<string | undefined> {
  if (!config) {
    if (required) {
      return "Storage must be selected";
    } else {
      return undefined;
    }
  }

  const provider = StorageProviderManager.instance.getProvider(config.provider);
  if (!provider) {
    return "Storage provider not found";
  }

  const error = await provider.validateOptions(config.options);
  if (error) {
    return error;
  }

  return undefined;
}

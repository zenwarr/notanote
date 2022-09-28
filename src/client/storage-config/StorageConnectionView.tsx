import { StorageConnectionConfig, StorageProviderManager } from "../storage/StorageProvider";
import { Box, Select, MenuItem, SelectChangeEvent } from "@mui/material";


export type StorageConnectionViewProps = {
  isRemote: boolean;
  config: StorageConnectionConfig | undefined;
  onChange?: (config: StorageConnectionConfig) => void;
}


export function StorageConnectionView(props: StorageConnectionViewProps) {
  const provider = props.config?.provider ? StorageProviderManager.instance.getProvider(props.config?.provider) : undefined;

  function onProviderChange(e: SelectChangeEvent) {
    const name = e.target.value as string;

    props.onChange?.({
      ...props.config,
      provider: name,
    });
  }

  function onOptionsChange(o: unknown) {
    if (!props.config?.provider) {
      return;
    }

    props.onChange?.({
      provider: props.config?.provider,
      options: o
    });
  }

  return <>
    <Box mb={ 2 }>
      <Select value={ props.config?.provider || "" } onChange={ onProviderChange } fullWidth>
        {
          StorageProviderManager.instance.getProviders()
          .filter(p => props.isRemote ? p.syncFactory : p.storageFactory)
          .map(p => <MenuItem value={ p.name } key={ p.name }>{ p.title }</MenuItem>)
        }
      </Select>
    </Box>

    {
        provider && <provider.configEditor config={ props.config?.options } onChange={ onOptionsChange }/>
    }
  </>;
}

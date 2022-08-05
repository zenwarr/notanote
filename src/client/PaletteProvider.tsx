import * as React from "react";
import { useEffect, useState } from "react";
import { Palette, PaletteCompleter } from "./Palette";
import { ClientWorkspace } from "./ClientWorkspace";
import { filePaletteCompleter } from "./PaletteCompleter";
import { CommandManager, commandPaletteCompleter } from "./commands/CommandManager";
import { StoragePath } from "@storage/StoragePath";


export enum PaletteMode {
  File,
  Command
}


let togglePaletteCb: ((mode: PaletteMode) => void) | undefined = undefined;


export function PaletteProvider(props: React.PropsWithChildren<{}>) {
  const [ mode, setMode ] = useState<PaletteMode | undefined>(undefined);

  useEffect(() => {
    togglePaletteCb = (newMode: PaletteMode) => {
      if (mode != null) {
        setMode(undefined);
      } else {
        setMode(newMode);
      }
    };

    return () => {
      togglePaletteCb = undefined;
    };
  }, [ mode ]);

  function onSelect(value: string) {
    if (mode === PaletteMode.File) {
      ClientWorkspace.instance.selectedEntry = new StoragePath(value);
    } else if (mode === PaletteMode.Command) {
      CommandManager.instance.run(value);
    }

    setMode(undefined);
  }

  let completer: PaletteCompleter | undefined;
  if (mode != null) {
    completer = mode === PaletteMode.File ? filePaletteCompleter : commandPaletteCompleter;
  }

  return <div>
    <Palette open={ mode != null } onClose={ () => setMode(undefined) }
             completer={ completer } onSelect={ onSelect }/>

    {
      props.children
    }
  </div>;
}


export function togglePalette(mode: PaletteMode) {
  togglePaletteCb?.(mode);
}

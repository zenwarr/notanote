import * as React from "react";
import { useEffect, useState } from "react";
import { Palette } from "./Palette";
import { workspaceFileCompleter, WorkspaceManager } from "./WorkspaceManager";


let togglePicker: (() => void) | undefined = undefined;

export function FilePickerProvider(props: React.PropsWithChildren<{}>) {
  const [ isOpen, setIsOpen ] = useState(false);

  useEffect(() => {
    togglePicker = () => {
      setIsOpen(!isOpen);
    };

    return () => {
      togglePicker = undefined;
    };
  }, [ isOpen ]);

  function onSelect(value: string) {
    setIsOpen(false);
    WorkspaceManager.instance.selectedEntryPath = value;
  }

  return <div>
    <Palette open={ isOpen } onClose={ () => setIsOpen(false) } completer={ workspaceFileCompleter } onSelect={ onSelect }/>

    {
      props.children
    }
  </div>;
}


export function toggleFilePicker() {
  togglePicker?.();
}

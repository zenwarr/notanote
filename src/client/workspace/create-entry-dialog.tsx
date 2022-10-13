import * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { Workspace } from "./workspace";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { StoragePath } from "@storage/storage-path";
import { StorageEntryType } from "@storage/entry-storage";


export type CreateEntryDialogProps = {
  open: boolean;
  onClose: () => void;
  parentPath: StoragePath;
  suggestedName: string;
  type: StorageEntryType;
}


function getInitialSelectionRange(p: string) {
  // get range of last filename part without extension
  const lastDot = p.lastIndexOf(".");
  const lastSlash = p.lastIndexOf("/");
  if (lastDot > lastSlash) {
    return [ lastSlash + 1, lastDot ];
  } else if (lastDot === -1) {
    return [ lastSlash + 1, p.length ];
  }

  return [ 0, 0 ]
}


export function CreateEntryDialog(props: CreateEntryDialogProps) {
  const [ inputPath, setPath ] = useState(() => props.parentPath.child(props.suggestedName).normalized);
  const [ loading, setLoading ] = useState(false);
  const inputRef = useRef<HTMLInputElement>();

  useLayoutEffect(() => {
    const initialValue = props.parentPath.child(props.suggestedName).normalized;

    const handle = setInterval(() => {
      if (inputRef.current) {
        const [ start, end ] = getInitialSelectionRange(initialValue);
        inputRef.current.selectionStart = start;
        inputRef.current.selectionEnd = end;
        clearInterval(handle);
      }
    }, 20);

    return () => clearInterval(handle);
  }, [])

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPath(e.target.value);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    try {
      await Workspace.instance.createEntry(new StoragePath(inputPath), props.type);
      props.onClose();
    } catch (err: any) {
      alert("Failed to create: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
      <Dialog open={ props.open } onClose={ props.onClose } aria-labelledby="form-dialog-title" keepMounted={ false }>
        <DialogTitle id="form-dialog-title">
          Create new { props.type === "dir" ? "directory" : "file" }
        </DialogTitle>

        <form onSubmit={ onCreate }>
          <DialogContent>
            <TextField
                autoFocus
                margin="dense"
                id="name"
                label={ (props.type === "dir" ? "Directory" : "File") + " name" }
                type="name"
                value={ inputPath }
                onChange={ onChange }
                fullWidth
                inputRef={ inputRef }
                variant="standard"/>
          </DialogContent>

          <DialogActions>
            <Button onClick={ props.onClose } color="primary" type={ "button" }>
              Cancel
            </Button>
            <Button type={ "submit" } color="primary" disabled={ loading }>
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>
  );
}

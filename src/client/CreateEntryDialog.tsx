import * as React from "react";
import { useState } from "react";
import { Workspace } from "./workspace/workspace";
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


export function CreateEntryDialog(props: CreateEntryDialogProps) {
  const [ inputPath, setPath ] = useState(() => props.parentPath.child(props.suggestedName).normalized);
  const [ loading, setLoading ] = useState(false);

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
            variant="standard" />
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

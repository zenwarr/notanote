import * as React from "react";
import * as path from "path";
import { useState } from "react";
import { WorkspaceManager } from "./WorkspaceManager";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { EntryType } from "../common/WorkspaceEntry";


export type CreateEntryDialogProps = {
  open: boolean;
  onClose: () => void;
  parentPath: string;
  suggestedName: string;
  type: EntryType;
}


export function CreateEntryDialog(props: CreateEntryDialogProps) {
  const [ inputPath, setPath ] = useState<string>(() => path.join(props.parentPath, props.suggestedName));
  const [ loading, setLoading ] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPath(e.target.value);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    try {
      await WorkspaceManager.instance.createEntry(inputPath, props.type);
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

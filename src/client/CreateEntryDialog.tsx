import * as React from "react";
import { useState } from "react";
import { WorkspaceManager } from "./WorkspaceManager";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@material-ui/core";
import { EntryType } from "../common/WorkspaceEntry";


export type CreateEntryDialogProps = {
  open: boolean;
  onClose: () => void;
  parentPath: string;
  type: EntryType;
}

export function CreateEntryDialog(props: CreateEntryDialogProps) {
  const [ name, setName ] = useState<string | undefined>();
  const [ loading, setLoading ] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    try {
      await WorkspaceManager.instance.createEntry(props.parentPath, name, props.type);
      props.onClose();
    } catch (error) {
      alert("Failed to create: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return <Dialog open={ props.open } onClose={ props.onClose } aria-labelledby="form-dialog-title" keepMounted={ false }>
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
            value={ name }
            onChange={ onChange }
            fullWidth
        />
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
  </Dialog>;
}

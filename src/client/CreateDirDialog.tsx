import * as React from "react";
import { useState } from "react";
import { WorkspaceManager } from "./WorkspaceManager";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@material-ui/core";


export type CreateDirDialogProps = {
  open: boolean;
  onClose: () => void;
  parentPath: string;
}

export function CreateDirDialog(props: CreateDirDialogProps) {
  const [ name, setName ] = useState<string | undefined>();
  const [ loading, setLoading ] = useState(false);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    try {
      await WorkspaceManager.instance.createEntry(props.parentPath, name, "dir");
      props.onClose();
    } catch (error) {
      alert("Failed to create directory: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return <Dialog open={ props.open } onClose={ props.onClose } aria-labelledby="form-dialog-title" keepMounted={ false }>
    <DialogTitle id="form-dialog-title">Directory name</DialogTitle>

    <form onSubmit={ onCreate }>
      <DialogContent>
        <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Directory name"
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

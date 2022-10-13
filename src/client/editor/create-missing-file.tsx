import { Box, Button } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { StorageEntryType } from "@storage/entry-storage";
import { StoragePath } from "@storage/storage-path";
import * as React from "react";
import { useState } from "react";
import { Workspace } from "../workspace/workspace";


export type CreateMissingFileProps = {
  path: StoragePath;
}


export function CreateMissingFile(props: CreateMissingFileProps) {
  const classes = useStyles();

  const [ creating, setCreating ] = useState(false);

  async function onClick() {
    setCreating(true);
    try {
      await Workspace.instance.createEntry(props.path, StorageEntryType.File);
      Workspace.instance.triggerEditorReload();
    } catch (err: any) {
      alert(`Failed to create file ${ props.path.normalized }: ${ err.message }`);
    } finally {
      setCreating(false);
    }
  }

  return <div className={ classes.error }>
    <Box mb={ 2 }>
      File { props.path.normalized } does not exists
    </Box>
    <Button variant={ "contained" } onClick={ onClick } disabled={ creating }>
      Create
    </Button>
  </div>;
}


const useStyles = makeStyles(theme => ({
  error: {
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    color: theme.palette.error.main,
    justifyContent: "center",
    alignItems: "center"
  }
}));

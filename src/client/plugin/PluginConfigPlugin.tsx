import { PluginMeta } from "./PluginManager";
import { Document, DocumentEditorStateAdapter } from "../Document";
import { useRef, useState } from "react";
import assert from "assert";
import {
  Box,
  Paper,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Dialog,
  DialogTitle,
  DialogContent, DialogActions
} from "@mui/material";
import { observer } from "mobx-react-lite";
import { makeAutoObservable, toJS } from "mobx";
import { Form } from "react-final-form";
import { TextField } from "mui-rff";
import { PluginBackend } from "../backend/PluginBackend";
import { Backend } from "../backend/Backend";
import { ClientWorkspace } from "../ClientWorkspace";
import { CommandManager } from "../commands/CommandManager";


export interface PluginManagerConfig {
  plugins?: {
    name: string;
    gitCloneUrl: string;
  }[];
}


function useEditorState(doc: Document) {
  const stateAdapter = useRef<PluginConfigEditorState>(doc.getEditorStateAdapter() as PluginConfigEditorState);
  assert(stateAdapter.current instanceof PluginConfigEditorState);
  return stateAdapter.current;
}


function getUpdatePluginCommandName(plugin: string) {
  return `Update plugin ${ plugin }`;
}


export const PluginConfigEditor = observer((props: { doc: Document }) => {
  const state = useEditorState(props.doc);
  const [ cloneDialogOpen, setCloneDialogOpen ] = useState(false);

  async function update(pluginName: string) {
    const wsId = ClientWorkspace.instance.remoteStorageId;
    await CommandManager.instance.runAction(getUpdatePluginCommandName(pluginName), () => Backend.get(PluginBackend).update(wsId, pluginName));
  }

  return <Box p={ 2 }>
    <Box mb={ 2 }>
      <Button variant={ "contained" } onClick={ () => setCloneDialogOpen(true) }>
        Clone from Git
      </Button>
    </Box>

    <CloneDialog doc={ props.doc } open={ cloneDialogOpen } onClose={ () => setCloneDialogOpen(false) }/>

    <TableContainer component={ Paper }>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Git Clone URL</TableCell>
            <TableCell/>
          </TableRow>
        </TableHead>

        <TableBody>
          {
            state.data.plugins?.map((plugin, i) => <TableRow key={ i }>
              <TableCell>{ plugin.name }</TableCell>
              <TableCell>{ plugin.gitCloneUrl }</TableCell>
              <TableCell>
                { plugin.gitCloneUrl != null && <Button variant={ "contained" } onClick={ () => update(plugin.name) }
                                                        disabled={ CommandManager.instance.isCommandRunning(getUpdatePluginCommandName(plugin.name)) }>
                  Update
                </Button> }
              </TableCell>
            </TableRow>)
          }
        </TableBody>
      </Table>
    </TableContainer>
  </Box>;
});


function CloneDialog(props: { open: boolean, onClose: () => void, doc: Document }) {
  async function clone(params: { url: string | undefined, name: string | undefined }) {
    if (!params.url) {
      alert("Please enter a Git URL");
      return;
    }

    if (!params.name) {
      alert("Please enter a name");
      return;
    }

    try {
      await Backend.get(PluginBackend).clone(ClientWorkspace.instance.remoteStorageId, params.name, params.url);
      props.onClose();
    } catch (error: any) {
      alert(`Failed to clone plugin: ${ error.message }`);
    }
  }

  return <Dialog open={ props.open } onClose={ props.onClose }>
    <DialogTitle>Clone plugin from git repository</DialogTitle>
    <Form onSubmit={ clone }>
      {
        formProps => <form onSubmit={ formProps.handleSubmit }>
          <DialogContent>
            <TextField name={ "name" } label={ "Plugin name" } variant={ "filled" }/>

            <TextField name={ "url" } label={ "Git clone url" } variant={ "filled" }/>

            <DialogActions>
              <Button onClick={ props.onClose }>Cancel</Button>
              <Button disabled={ formProps.submitting } type={ "submit" }>Clone</Button>
            </DialogActions>
          </DialogContent>
        </form>
      }
    </Form>
  </Dialog>;
}


export class PluginConfigEditorState implements DocumentEditorStateAdapter {
  constructor(doc: Document) {
    makeAutoObservable(this);

    try {
      this.data = JSON.parse(doc.getLastSavedText());
    } catch (err: any) {
      this.data = {};
    }
  }


  public serializeContent(): string | Promise<string> {
    return JSON.stringify(toJS(this.data), null, 2);
  }


  data: PluginManagerConfig;
}


export const pluginConfigPlugin: PluginMeta = {
  name: "pluginConfig",
  load: class {
    editors = {
      editor: {
        component: PluginConfigEditor,
        stateAdapter: PluginConfigEditorState
      }
    };
  }
};

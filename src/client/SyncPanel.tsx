import { observer } from "mobx-react-lite";
import { WorkspaceManager } from "./WorkspaceManager";
import { DocumentManager } from "./DocumentManager";
import { SaveState } from "./Document";
import { CircularProgress, makeStyles } from "@material-ui/core";


export const SyncPanel = observer(() => {
  const classes = useStyles();

  let workspaceManager = WorkspaceManager.instance;
  const currentDoc = workspaceManager.selectedEntryPath ? DocumentManager.instance.documents.get(workspaceManager.selectedEntryPath)?.doc : undefined;

  const savingDocsCount = [ ...DocumentManager.instance.documents.values() ].filter(d => {
    return d.doc !== currentDoc && d.doc.saveState === SaveState.Saving;
  }).length;

  const unsavedDocsCount = [ ...DocumentManager.instance.documents.values() ].filter(d => {
    return d.doc !== currentDoc && d.doc.saveState === SaveState.UnsavedChanges;
  }).length;

  const currentDocSaving = currentDoc?.saveState === SaveState.Saving;
  const currentDocHasUnsavedChanges = currentDoc?.saveState === SaveState.UnsavedChanges;

  let curDocState = <></>;
  if (currentDocSaving) {
    curDocState = <>saving...</>;
  } else if (currentDocHasUnsavedChanges) {
    curDocState = <>*</>;
  }

  let extraDocState = "";
  if (savingDocsCount) {
    extraDocState = `+${ savingDocsCount } saving`;
  } else if (unsavedDocsCount) {
    extraDocState = (extraDocState ? ", " : "") + `+${ unsavedDocsCount } changed`;
  }

  return <div className={ classes.root }>
    { curDocState }

    { extraDocState }
  </div>;
});


const useStyles = makeStyles(theme => ({
  root: {
    color: theme.palette.grey.A200
  }
}));

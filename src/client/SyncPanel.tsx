import { observer } from "mobx-react-lite";
import { WorkspaceManager } from "./WorkspaceManager";
import { DocumentManager } from "./DocumentManager";
import { SaveState } from "./Document";
import { makeStyles } from "@material-ui/core";
import cn from "classnames";


export const SyncPanel = observer(() => {
  const classes = useStyles();

  let workspaceManager = WorkspaceManager.instance;
  const currentDoc = workspaceManager.selectedEntry ? DocumentManager.instance.documents.get(workspaceManager.selectedEntry)?.doc : undefined;

  let docs = [ ...DocumentManager.instance.documents.values() ];
  const savingDocsCount = docs.filter(d => {
    return d.doc !== currentDoc && d.doc.saveState === SaveState.Saving;
  }).length;

  const unsavedDocsCount = docs.filter(d => {
    return d.doc !== currentDoc && d.doc.saveState === SaveState.UnsavedChanges;
  }).length;

  const hasErrors = docs.some(doc => doc.doc.lastSaveError != null);

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

  const className = cn(classes.root, {
    [classes.rootWithError]: hasErrors && !currentDocSaving
  });

  return <div className={ className }>
    { curDocState }

    { extraDocState }
  </div>;
});


const useStyles = makeStyles(theme => ({
  root: {
    color: theme.palette.grey.A200
  },
  rootWithError: {
    color: "red"
  }
}));

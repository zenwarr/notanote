import { observer } from "mobx-react-lite";
import { DocumentManager } from "./DocumentManager";
import { Document, SaveState } from "./Document";
import { CircularProgress, makeStyles } from "@material-ui/core";


export type SyncPanelProps = {
  currentDoc?: Document;
}


export const SyncPanel = observer((props: SyncPanelProps) => {
  const classes = useStyles();

  const savingDocsCount = [ ...DocumentManager.instance.documents.values() ].filter(d => {
    return d.doc !== props.currentDoc && d.doc.saveState === SaveState.Saving;
  }).length;

  const unsavedDocsCount = [ ...DocumentManager.instance.documents.values() ].filter(d => {
    return d.doc !== props.currentDoc && d.doc.saveState === SaveState.UnsavedChanges;
  }).length;

  const currentDocSaving = props.currentDoc?.saveState === SaveState.Saving;
  const currentDocHasUnsavedChanges = props.currentDoc?.saveState === SaveState.UnsavedChanges;

  let curDocState = <></>;
  if (currentDocSaving) {
    curDocState = <CircularProgress/>;
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

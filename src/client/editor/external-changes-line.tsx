import { Stack, Button } from "@mui/material";
import { Document } from "../document/document";
import * as mobx from "mobx-react-lite";
import { Workspace } from "workspace/workspace";


export type ExternalChangesLineProps = {
  doc: Document
}


export const ExternalChangesLine = mobx.observer((props: ExternalChangesLineProps) => {
  if (props.doc.removedExternally) {
    return <Stack direction={ "row" } spacing={ 2 } p={ 1 } alignItems={ "center" }>
      <span>File is removed externally</span>

      <Button variant={ "outlined" } size={ "small" } onClick={ () => {
        props.doc.close(false);
        Workspace.instance.navigateToPath(undefined);
      } }>
        Close and drop changes
      </Button>

      <Button variant={ "outlined" } size={ "small" } onClick={ () => props.doc.save(true) }>
        Save and restore file
      </Button>
    </Stack>;
  } else if (props.doc.updatedExternally) {
    return <Stack direction={ "row" } spacing={ 2 } p={ 1 } alignItems={ "center" }>
      <span>File is updated externally</span>

      <Button variant={ "outlined" } size={ "small" } onClick={ () => props.doc.reload() }>
        Load external changes
      </Button>

      <Button variant={ "outlined" } size={ "small" } onClick={ () => props.doc.save(true) }>
        Drop external changes and save
      </Button>
    </Stack>;
  } else {
    return null;
  }
});

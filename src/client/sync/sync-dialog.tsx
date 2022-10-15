import { FullScreenDialog } from "../utils/full-screen-dialog";
import { SyncPanel } from "./sync-panel";


export type SyncDialogProps = {
  open: boolean
  onClose?: () => void;
}


export function SyncDialog(props: SyncDialogProps) {
  return <FullScreenDialog open={ props.open } onClose={ props.onClose } title={ "Sync" }>
    <SyncPanel/>
  </FullScreenDialog>;
}

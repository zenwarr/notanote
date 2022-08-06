import { FullScreenDialog } from "../utils/FullScreenDialog";
import { SyncPanel } from "./SyncPanel";


export type SyncDialogProps = {
  open: boolean
  onClose?: () => void;
}


export function SyncDialog(props: SyncDialogProps) {
  return <FullScreenDialog open={ props.open } onClose={ props.onClose } title={ "Sync" }>
    <SyncPanel/>
  </FullScreenDialog>;
}

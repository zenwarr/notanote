import { Dialog, Box } from "@mui/material";
import { SyncPanel } from "./SyncPanel";


export type SyncDialogProps = {
  open: boolean
  onClose?: () => void;
}


export function SyncDialog(props: SyncDialogProps) {
  return <Dialog fullScreen open={ props.open } onClose={ props.onClose }>
    <Box p={ 2 }>
      <SyncPanel/>
    </Box>
  </Dialog>;
}

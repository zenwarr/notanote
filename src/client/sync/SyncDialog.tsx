import { Dialog, Box, IconButton, Toolbar, AppBar, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { SyncPanel } from "./SyncPanel";


export type SyncDialogProps = {
  open: boolean
  onClose?: () => void;
}


export function SyncDialog(props: SyncDialogProps) {
  return <Dialog fullScreen open={ props.open } onClose={ props.onClose }>
    <AppBar sx={ { position: "relative" } }>
      <Toolbar>
        <Typography sx={ { flex: 1 } } variant="h6" component="div">
          Sync
        </Typography>

        <IconButton
            edge="start"
            color="inherit"
            onClick={ props.onClose }
            aria-label="close">
          <CloseIcon/>
        </IconButton>
      </Toolbar>
    </AppBar>

    <Box p={ 2 }>
      <SyncPanel/>
    </Box>
  </Dialog>;
}

import CloseIcon from "@mui/icons-material/Close";
import { AppBar, Box, Dialog, IconButton, Toolbar, Typography } from "@mui/material";


export type FullScreenDialogProps = {
  title: React.ReactNode;
  open: boolean
  onClose?: () => void;
  children?: React.ReactNode;
}


export function FullScreenDialog(props: FullScreenDialogProps) {
  return <Dialog fullScreen open={ props.open } onClose={ props.onClose }>
    <AppBar sx={ { position: "relative" } }>
      <Toolbar>
        <Typography sx={ { flex: 1 } } variant="h6" component="div">
          { props.title }
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
      { props.children }
    </Box>
  </Dialog>;
}

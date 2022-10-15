import CloseIcon from "@mui/icons-material/Close";
import { AppBar, Dialog, IconButton, Toolbar, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";


export type FullScreenDialogProps = {
  title: React.ReactNode;
  open: boolean
  onClose?: () => void;
  children?: React.ReactNode;
}


export function FullScreenDialog(props: FullScreenDialogProps) {
  const classes = useStyles();

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

    <div className={ classes.container }>
      { props.children }
    </div>
  </Dialog>;
}


const useStyles = makeStyles(theme => ({
  container: {
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    height: "100%"
  }
}));

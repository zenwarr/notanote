import { CircularProgress } from "@mui/material";
import { makeStyles } from "@mui/styles";
import * as React from "react";
import { LoadState } from "../use-load";


export type LoadGuardProps<T> = {
  loadState: LoadState<T>;
  children: (data: T) => React.ReactNode;
  errorFormat?: (err: string) => React.ReactNode;
  size?: string | number;
}


export function LoadGuard<T>(props: LoadGuardProps<T>) {
  const classes = useStyles();

  if (props.loadState.loadError) {
    return <div className={ classes.error }>
      {
        props.errorFormat ? props.errorFormat(props.loadState.loadError.message) : "Error: " + props.loadState.loadError
      }
    </div>;
  }

  if (!props.loadState.isLoaded) {
    return <div className={ classes.loader }>
      <CircularProgress size={ props.size }/>
    </div>;
  }

  return <>
    { props.children(props.loadState.data) }
  </>;
}


const useStyles = makeStyles(theme => ({
  loader: {
    padding: theme.spacing(2),
    display: "flex",
    justifyContent: "center"
  },

  error: {
    padding: theme.spacing(2),
    display: "flex",
    color: theme.palette.error.main,
    justifyContent: "center"
  }
}));

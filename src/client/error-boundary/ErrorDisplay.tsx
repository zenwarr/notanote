import { makeStyles } from "@mui/styles";
import { useState } from "react";
import { Button } from "@mui/material"


export type ErrorDisplayProps = {
  error: any;
  title?: string;
}


/**
 * Shows error with message and stack
 */
export function ErrorDisplay(props: ErrorDisplayProps) {
  const info = getErrorInfo(props.error);
  const classes = useStyles();
  const [ opened, setOpened ] = useState(false);

  return <div className={ classes.root }>
    {
      props.title != null && <>
        { props.title }

        <br />
      </>
    }

    { info.message }

    {
      info.stack && <div>
        <Button variant={ "contained" } onClick={ () => setOpened(!opened) }>
          { opened ? "-" : "+" } Technical details
        </Button>

        {
          opened && <div>
            <pre>
              { info.stack }
            </pre>
          </div>
        }
      </div>
    }
  </div>;
}


const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.error.main,
    fontFamily: "monospace",
    color: theme.palette.text.primary,
    margin: theme.spacing(2)
  },

  details: {
    marginTop: theme.spacing(2)
  }
}));


function getErrorInfo(err: any): { message: string, stack: string | undefined } {
  let message: string;

  if (typeof err === "string") {
    message = err;
  } else if (typeof err === "object" && err != null && typeof err.message === "string") {
    message = err.message;
  } else if (err == null) {
    message = "Unknown error (error object is empty)";
  } else {
    message = "Unknown error";
  }

  let stack: string | undefined;
  if (typeof err === "object" && err != null && typeof err.stack === "string") {
    stack = err.stack;
  }

  return { message, stack };
}

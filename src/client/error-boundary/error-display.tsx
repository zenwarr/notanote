import { useState } from "react";
import "./error-display.css";


export type ErrorDisplayProps = {
  error: any;
  title?: string;
}


/**
 * Shows error with message and stack
 */
export function ErrorDisplay(props: ErrorDisplayProps) {
  const info = getErrorInfo(props.error);
  const [ opened, setOpened ] = useState(false);

  return <div className={ "error-display" }>
    {
      props.title != null && <>
        { props.title }

        <br />
      </>
    }

    { info.message }

    {
      info.stack && <div>
        <button onClick={ () => setOpened(!opened) }>
          { opened ? "-" : "+" } Technical details
        </button>

        {
          opened && <div>
            <pre className={ "error-display__stack" }>
              { info.stack }
            </pre>
          </div>
        }
      </div>
    }
  </div>;
}


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

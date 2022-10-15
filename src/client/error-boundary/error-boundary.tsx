import * as React from "react";
import { ErrorDisplay } from "./error-display";


interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
  stack?: string;
  opened?: boolean;
}


export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  public constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = {
      hasError: false
    };
  }


  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({
      hasError: true,
      message: error.message || "Unknown error",
      stack: errorInfo.componentStack
    });
  }


  public render() {
    if (this.state.hasError) {
      return <div className={ "fatal-error" }>
        <ErrorDisplay error={ this.state } title={"Component error"} />
      </div>;
    } else {
      return this.props.children;
    }
  }
}

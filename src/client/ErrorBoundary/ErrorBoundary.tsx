import * as React from "react";
import "./ErrorBoundary.css";


interface ErrorBoundaryState {
  hasError: boolean;
  text?: string;
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
      text: error.message || "Unknown error",
      stack: errorInfo.componentStack
    });
  }


  public render() {
    if (this.state.hasError) {
      return <div className={ "fatal-error" }>
        <div className={ "error-boundary" }>
          Component error

          <br/>

          { this.state.text }

          <div className={ "fatal-error__details" }>
            <button className={ "fatal-error__button" }
                    onClick={ () => this.setState({ opened: !this.state.opened }) }>
              { this.state.opened ? "-" : "+" } Technical details
            </button>

            { this.state.opened && <div>
              <pre>
                { this.state.stack }
              </pre>
            </div> }
          </div>
        </div>
      </div>;
    } else {
      return this.props.children;
    }
  }
}

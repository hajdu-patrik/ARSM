/** Error boundary that falls back to the localized server-error page; wraps the app router. */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ServerError } from '../../pages/ServerError';

/** Props for the {@link ErrorBoundary} wrapper component. */
interface ErrorBoundaryProps {
  /** Child components to protect with the error boundary. */
  readonly children: ReactNode;
}

/** Internal state tracking whether an error has been caught. */
interface ErrorBoundaryState {
  /** Whether an unhandled error has occurred in the subtree. */
  hasError: boolean;
}

/** Internal props for the class-based error boundary implementation. */
interface ErrorBoundaryInnerProps extends ErrorBoundaryProps {
  /** Fallback UI rendered when an error is captured. */
  readonly fallback: ReactNode;
}

/** Internal class component implementing the error boundary lifecycle and rendering the fallback UI. */
class ErrorBoundaryInner extends Component<ErrorBoundaryInnerProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryInnerProps) {
    super(props);
    this.state = { hasError: false };
  }

  /** Updates state after an error so the fallback can be rendered. */
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  /** Logs captured errors in development mode to aid debugging. */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

/** App-level error boundary that switches to the server-error page when an uncaught render error is captured. */
export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <ErrorBoundaryInner fallback={<ServerError />}>
      {children}
    </ErrorBoundaryInner>
  );
}

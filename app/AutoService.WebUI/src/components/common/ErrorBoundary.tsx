/** Error boundary that falls back to the localized server-error page; wraps the app router. */

import { Component, type ReactNode } from 'react';
import { ServerError } from '../../pages/ServerError';
import { logError } from '../../utils/devLog';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryInnerProps extends ErrorBoundaryProps {
  readonly fallback: ReactNode;
}

class ErrorBoundaryInner extends Component<ErrorBoundaryInnerProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryInnerProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  /** Logs the captured error through the shared logger: the whole error in DEV, only its name in production. */
  componentDidCatch(error: Error) {
    logError('ErrorBoundary', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <ErrorBoundaryInner fallback={<ServerError />}>
      {children}
    </ErrorBoundaryInner>
  );
}

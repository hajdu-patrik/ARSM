/**
 * React Error Boundary with i18n-aware fallback UI.
 *
 * Catches unhandled errors in the component tree and displays a
 * localized error message with a reload button. Logs errors to
 * console in development mode only. Wraps the main app router.
 * @module components/common/ErrorBoundary
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

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

/**
 * Internal class component implementing the error boundary lifecycle.
 * Renders the provided fallback UI when an error is caught.
 */
class ErrorBoundaryInner extends Component<ErrorBoundaryProps & { readonly fallback: ReactNode }, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps & { readonly fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

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

function ErrorFallback() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-arsm-surface dark:bg-arsm-surface-dark">
      <div className="mx-4 max-w-md rounded-2xl border border-arsm-border bg-arsm-input p-8 text-center dark:border-arsm-border-dark dark:bg-arsm-card-dark">
        <h1 className="mb-3 text-xl font-semibold text-arsm-primary dark:text-arsm-primary-dark">
          {t('errorBoundary.title', 'Something went wrong')}
        </h1>
        <p className="mb-6 text-sm text-arsm-muted dark:text-arsm-muted-dark">
          {t('errorBoundary.message', 'An unexpected error occurred. Please reload the page.')}
        </p>
        <button
          type="button"
          onClick={() => globalThis.location.reload()}
          className="inline-flex items-center justify-center rounded-xl bg-arsm-accent px-6 py-3 text-sm font-semibold text-arsm-primary transition hover:bg-arsm-accent-hover dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover"
        >
          {t('errorBoundary.reload', 'Reload page')}
        </button>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <ErrorBoundaryInner fallback={<ErrorFallback />}>
      {children}
    </ErrorBoundaryInner>
  );
}

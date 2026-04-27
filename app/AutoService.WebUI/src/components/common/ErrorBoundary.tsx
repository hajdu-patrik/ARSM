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
      <div className="fade-in-up relative mx-4 max-w-md overflow-hidden rounded-3xl border border-arsm-error-border-light bg-arsm-card p-8 text-center shadow-[0_20px_50px_rgba(170,44,53,0.08),0_0_0_1px_rgba(255,255,255,0.5)_inset] dark:border-arsm-error-dark dark:bg-arsm-card-dark dark:shadow-[0_24px_56px_rgba(170,44,53,0.04),0_0_0_1px_rgba(255,255,255,0.04)_inset]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(215,82,94,0.06)_0%,rgba(215,82,94,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(215,82,94,0.08)_0%,rgba(215,82,94,0)_100%)]" />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-arsm-error-bg shadow-[0_6px_16px_rgba(215,82,94,0.1)] dark:bg-arsm-error-bg-dark dark:shadow-[0_6px_16px_rgba(215,82,94,0.06)]">
          <span className="text-2xl" aria-hidden="true">!</span>
        </div>
        <h1 className="mb-3 text-xl font-semibold text-arsm-primary dark:text-arsm-primary-dark">
          {t('errorBoundary.title', 'Something went wrong')}
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-arsm-muted dark:text-arsm-muted-dark">
          {t('errorBoundary.message', 'An unexpected error occurred. Please reload the page.')}
        </p>
        <button
          type="button"
          onClick={() => globalThis.location.reload()}
          className="inline-flex items-center justify-center rounded-xl bg-arsm-accent px-6 py-3 text-sm font-semibold text-arsm-primary shadow-[0_10px_24px_rgba(97,67,154,0.24)] transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover hover:shadow-[0_14px_30px_rgba(97,67,154,0.3)] dark:bg-arsm-accent-dark dark:text-arsm-hover dark:shadow-[0_12px_26px_rgba(8,10,20,0.5)] dark:hover:bg-arsm-accent-dark-hover"
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

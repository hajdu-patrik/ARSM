import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

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
    <div className="flex min-h-screen items-center justify-center bg-[#ECECEF] dark:bg-[#09090F]">
      <div className="mx-4 max-w-md rounded-2xl border border-[#D8D2E9] bg-[#F6F4FB] p-8 text-center dark:border-[#3A3154] dark:bg-[#13131B]">
        <h1 className="mb-3 text-xl font-semibold text-[#2C2440] dark:text-[#EDE8FA]">
          {t('errorBoundary.title', 'Something went wrong')}
        </h1>
        <p className="mb-6 text-sm text-[#6A627F] dark:text-[#B9B0D3]">
          {t('errorBoundary.message', 'An unexpected error occurred. Please reload the page.')}
        </p>
        <button
          type="button"
          onClick={() => globalThis.location.reload()}
          className="inline-flex items-center justify-center rounded-xl bg-[#C9B3FF] px-6 py-3 text-sm font-semibold text-[#2C2440] transition hover:bg-[#BFA6F7] dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6]"
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

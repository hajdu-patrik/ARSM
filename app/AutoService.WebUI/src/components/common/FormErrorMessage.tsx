/**
 * Inline form validation error display component.
 * Resolves i18n message keys and renders a styled error paragraph.
 * @module FormErrorMessage
 */
import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Props for the {@link FormErrorMessage} component. */
interface FormErrorMessageProps {
  /** i18n key for the error message. When falsy, the component renders nothing. */
  readonly message?: string | null;
  /** Interpolation values passed to the i18n translation function. */
  readonly messageValues?: Record<string, string | number>;
  /** HTML `id` attribute, useful for `aria-describedby` associations. */
  readonly id?: string;
  /** ARIA live-region role. Defaults to `'alert'`. */
  readonly role?: 'alert' | 'status';
  /** Additional CSS classes appended to the default styling. */
  readonly className?: string;
}

/** Default Tailwind classes for the error message container (light + dark). */
const DEFAULT_CLASS_NAME =
  'rounded-lg border border-arsm-error-border-light bg-arsm-error-bg px-3 py-2 text-sm font-medium text-arsm-error-active dark:border-arsm-error-text-dark dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light';

/** Default visibility duration for inline error messages. */
const INLINE_ERROR_DURATION_MS = 5000;

/** Memoized form error message that resolves an i18n key and renders a styled alert paragraph. */
const FormErrorMessageComponent = memo(function FormErrorMessage({
  message,
  messageValues,
  id,
  role = 'alert',
  className,
}: FormErrorMessageProps) {
  const { t } = useTranslation();
  const messageToken = useMemo(() => Symbol(message ?? 'inline-error-message'), [message]);
  const [dismissedToken, setDismissedToken] = useState<symbol | null>(null);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setDismissedToken(messageToken);
    }, INLINE_ERROR_DURATION_MS);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [message, messageToken]);

  if (!message || dismissedToken === messageToken) {
    return null;
  }

  const renderedMessage = t(message, {
    ...messageValues,
    defaultValue: message,
  });

  return (
    <p id={id} role={role} className={className ? `${DEFAULT_CLASS_NAME} ${className}` : DEFAULT_CLASS_NAME}>
      {renderedMessage}
    </p>
  );
});

FormErrorMessageComponent.displayName = 'FormErrorMessage';

export const FormErrorMessage = FormErrorMessageComponent;

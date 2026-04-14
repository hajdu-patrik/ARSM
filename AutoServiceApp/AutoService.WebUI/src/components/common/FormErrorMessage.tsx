/**
 * Inline form validation error display component.
 * Resolves i18n message keys and renders a styled error paragraph.
 * @module FormErrorMessage
 */
import { memo } from 'react';
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
  'rounded-lg border border-[#F4C8CB] bg-[#FDF2F3] px-3 py-2 text-sm font-medium text-[#C13C45] dark:border-[#6A2D33] dark:bg-[#2B171A] dark:text-[#FF9AA0]';

/** Memoized form error message that resolves an i18n key and renders a styled alert paragraph. */
const FormErrorMessageComponent = memo(function FormErrorMessage({
  message,
  messageValues,
  id,
  role = 'alert',
  className,
}: FormErrorMessageProps) {
  const { t } = useTranslation();

  if (!message) {
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

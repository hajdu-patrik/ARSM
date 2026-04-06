import { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface FormErrorMessageProps {
  readonly message?: string | null;
  readonly messageValues?: Record<string, string | number>;
  readonly id?: string;
  readonly role?: 'alert' | 'status';
  readonly className?: string;
}

const DEFAULT_CLASS_NAME =
  'rounded-lg border border-[#F4C8CB] bg-[#FDF2F3] px-3 py-2 text-sm font-medium text-[#C13C45] dark:border-[#6A2D33] dark:bg-[#2B171A] dark:text-[#FF9AA0]';

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

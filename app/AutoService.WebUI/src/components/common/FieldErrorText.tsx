/** Inline validation message of one field, bound to the field through `aria-describedby`. */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { toneTextClasses } from '../../utils/formStyles';

interface FieldErrorTextProps {
  readonly id: string;
  readonly messageKey: string | undefined;
}

/** Renders the localized error under a field while the field has one, nothing otherwise. */
export const FieldErrorText = memo(function FieldErrorText({ id, messageKey }: FieldErrorTextProps) {
  const { t } = useTranslation();

  if (messageKey === undefined) {
    return null;
  }

  return (
    <p id={id} className={`mt-1 min-w-0 text-xs [overflow-wrap:anywhere] ${toneTextClasses.error}`}>
      {t(messageKey)}
    </p>
  );
});

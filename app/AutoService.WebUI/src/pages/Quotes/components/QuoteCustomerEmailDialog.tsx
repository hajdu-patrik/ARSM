/** Asks for the customer's e-mail address when a quote cannot be sent for lack of a usable one; confirming saves it and sends. */
import { memo, useId } from 'react';
import type { TFunction } from 'i18next';
import { Send } from 'lucide-react';
import { ConfirmModal } from '../../../components/common/ConfirmModal';
import { FieldErrorText } from '../../../components/common/FieldErrorText';
import { fieldErrorA11yProps } from '../../../utils/fieldA11y';
import { formFieldGroupClass, inputClass, labelClass, mutedBodyTextClass } from '../../../utils/formStyles';

interface QuoteCustomerEmailDialogProps {
  readonly isOpen: boolean;
  readonly email: string;
  readonly errorKey: string | null;
  readonly isSaving: boolean;
  readonly t: TFunction;
  readonly onEmailChange: (value: string) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

export const QuoteCustomerEmailDialog = memo(function QuoteCustomerEmailDialog({
  isOpen,
  email,
  errorKey,
  isSaving,
  t,
  onEmailChange,
  onClose,
  onConfirm,
}: QuoteCustomerEmailDialogProps) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const canConfirm = !isSaving && email.trim().length > 0;

  return (
    <ConfirmModal
      isOpen={isOpen}
      title={t('quotes.customerEmailDialog.title')}
      isBusy={isSaving}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={t('quotes.customerEmailDialog.confirm')}
      busyLabel={t('quotes.customerEmailDialog.confirming')}
      icon={Send}
      confirmDisabled={!canConfirm}
      confirmTestId="quote-customer-email-confirm-button"
    >
      <div className="space-y-3">
        <p className={`${mutedBodyTextClass} [overflow-wrap:anywhere]`}>{t('quotes.customerEmailDialog.description')}</p>
        <div className={formFieldGroupClass}>
          <label htmlFor={fieldId} className={labelClass}>{t('common.fields.email')}</label>
          <input
            id={fieldId}
            data-testid="quote-customer-email-input"
            type="email"
            autoComplete="off"
            placeholder={t('customers.emailPlaceholder')}
            value={email}
            onChange={(event) => {
              onEmailChange(event.target.value);
            }}
            onKeyDown={(event) => {
              // Enter does what the confirm button does, except while it commits an IME composition.
              if (event.key === 'Enter' && !event.nativeEvent.isComposing && canConfirm) {
                event.preventDefault();
                onConfirm();
              }
            }}
            className={inputClass}
            readOnly={isSaving}
            {...fieldErrorA11yProps(errorId, errorKey)}
          />
          {/* The alert wrapper stays mounted, so a failed save is announced when the message appears. */}
          <div role="alert">
            <FieldErrorText id={errorId} messageKey={errorKey ?? undefined} />
          </div>
        </div>
      </div>
    </ConfirmModal>
  );
});

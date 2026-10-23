/** The editor footer's delete action, shared by the draft and the locked footers. */
import type { TFunction } from 'i18next';
import { Trash2 } from 'lucide-react';
import { dangerButtonClass, defaultIconClass } from '../../../utils/formStyles';

interface QuoteDeleteButtonProps {
  readonly t: TFunction;
  readonly isBusy: boolean;
  readonly onDelete: () => void;
}

export function QuoteDeleteButton({ t, isBusy, onDelete }: QuoteDeleteButtonProps) {
  return (
    <button
      data-testid="quote-delete-draft-button"
      type="button"
      onClick={onDelete}
      disabled={isBusy}
      className={dangerButtonClass}
    >
      <Trash2 className={defaultIconClass} />
      <span>{t('quotes.deleteQuote')}</span>
    </button>
  );
}

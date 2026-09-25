/**
 * Quote editor footer actions.
 *
 * Which buttons exist is decided by the quote's status, the same state
 * machine the API enforces: a draft is saved, deleted or sent; a sent quote
 * is accepted or rejected; a decided quote only closes. Sending stays
 * disabled while the quote has no lines, and the button says why.
 * @module pages/Quotes/components/QuoteEditorModal.footer
 */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Check, Download, Save, Send, Trash2, X } from 'lucide-react';
import type { QuoteDetailDto, QuoteStatus } from '../../../types/quotes/quotes.types';
import { buttonClass, dangerButtonClass, defaultIconClass, secondaryButtonClass } from '../../../utils/formStyles';

interface QuoteEditorFooterProps {
  readonly t: TFunction;
  readonly quote: QuoteDetailDto | null;
  readonly isSaving: boolean;
  readonly isChangingStatus: boolean;
  readonly isDownloadingPdf: boolean;
  readonly canSaveHeader: boolean;
  readonly onClose: () => void;
  readonly onCreate: () => void;
  readonly onSaveHeader: () => void;
  readonly onChangeStatus: (status: QuoteStatus) => void;
  readonly onDownloadPdf: () => void;
  readonly onDelete: () => void;
}

const QuoteEditorFooterComponent = memo(function QuoteEditorFooter({
  t,
  quote,
  isSaving,
  isChangingStatus,
  isDownloadingPdf,
  canSaveHeader,
  onClose,
  onCreate,
  onSaveHeader,
  onChangeStatus,
  onDownloadPdf,
  onDelete,
}: QuoteEditorFooterProps) {
  const closeButton = (
    <button type="button" onClick={onClose} disabled={isSaving || isChangingStatus} className={secondaryButtonClass}>
      <X className={defaultIconClass} />
      <span>{t('quotes.close')}</span>
    </button>
  );

  // Printable in every status, a draft included: the mechanic needs the paper
  // for review and for handing it over, and the document names its own status.
  const downloadButton = (
    <button
      data-testid="quote-download-pdf-button"
      type="button"
      onClick={onDownloadPdf}
      disabled={isDownloadingPdf}
      aria-busy={isDownloadingPdf}
      className={secondaryButtonClass}
    >
      <Download className={defaultIconClass} />
      <span>{isDownloadingPdf ? t('quotes.downloadingPdf') : t('quotes.downloadPdf')}</span>
    </button>
  );

  if (!quote) {
    return (
      <>
        {closeButton}
        <button
          data-testid="quote-create-button"
          type="button"
          onClick={onCreate}
          disabled={isSaving}
          aria-busy={isSaving}
          className={buttonClass}
        >
          <Save className={defaultIconClass} />
          <span>{isSaving ? t('common.actions.saving') : t('quotes.createDraft')}</span>
        </button>
      </>
    );
  }

  if (quote.status === 'Draft') {
    const hasNoLines = quote.lines.length === 0;

    return (
      <>
        {closeButton}
        {downloadButton}
        <button
          data-testid="quote-delete-draft-button"
          type="button"
          onClick={onDelete}
          disabled={isSaving || isChangingStatus}
          className={dangerButtonClass}
        >
          <Trash2 className={defaultIconClass} />
          <span>{t('quotes.deleteQuote')}</span>
        </button>
        <button
          data-testid="quote-save-header-button"
          type="button"
          onClick={onSaveHeader}
          disabled={isSaving || isChangingStatus || !canSaveHeader}
          aria-busy={isSaving}
          className={secondaryButtonClass}
        >
          <Save className={defaultIconClass} />
          <span>{isSaving ? t('common.actions.saving') : t('common.actions.saveChanges')}</span>
        </button>
        <button
          data-testid="quote-send-button"
          type="button"
          onClick={() => onChangeStatus('Sent')}
          disabled={isSaving || isChangingStatus || hasNoLines}
          aria-busy={isChangingStatus}
          title={hasNoLines ? t('quotes.sendNeedsLineHint') : undefined}
          className={buttonClass}
        >
          <Send className={defaultIconClass} />
          <span>{t('quotes.sendQuote')}</span>
        </button>
      </>
    );
  }

  if (quote.status === 'Sent') {
    return (
      <>
        {closeButton}
        {downloadButton}
        <button
          data-testid="quote-reject-button"
          type="button"
          onClick={() => onChangeStatus('Rejected')}
          disabled={isSaving || isChangingStatus}
          aria-busy={isChangingStatus}
          className={dangerButtonClass}
        >
          <X className={defaultIconClass} />
          <span>{t('quotes.rejectQuote')}</span>
        </button>
        <button
          data-testid="quote-accept-button"
          type="button"
          onClick={() => onChangeStatus('Accepted')}
          disabled={isSaving || isChangingStatus}
          aria-busy={isChangingStatus}
          className={buttonClass}
        >
          <Check className={defaultIconClass} />
          <span>{t('quotes.acceptQuote')}</span>
        </button>
      </>
    );
  }

  return (
    <>
      {closeButton}
      {downloadButton}
    </>
  );
});

QuoteEditorFooterComponent.displayName = 'QuoteEditorFooter';

export const QuoteEditorFooter = QuoteEditorFooterComponent;

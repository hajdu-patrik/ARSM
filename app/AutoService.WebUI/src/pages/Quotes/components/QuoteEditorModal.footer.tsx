/** Footer actions gated by the server lock flag, then by quote status (see CLAUDE.md): locked close/PDF/delete, draft save/delete/send, sent accept/reject, decided close-only. */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Check, Download, Save, Send, X } from 'lucide-react';
import type { QuoteDetailDto, QuoteStatus } from '../../../types/quotes/quotes.types';
import { buttonClass, dangerButtonClass, defaultIconClass, secondaryButtonClass } from '../../../utils/formStyles';
import { isValidityPassed } from '../helpers';
import { QuoteDeleteButton } from './QuoteDeleteButton';

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

interface DraftActionsProps {
  readonly t: TFunction;
  readonly quote: QuoteDetailDto;
  readonly isSaving: boolean;
  readonly isChangingStatus: boolean;
  readonly canSaveHeader: boolean;
  readonly onSaveHeader: () => void;
  readonly onChangeStatus: (status: QuoteStatus) => void;
  readonly onDelete: () => void;
}

/** Draft-only actions after close and PDF: delete, save header and send. */
function DraftActions({
  t,
  quote,
  isSaving,
  isChangingStatus,
  canSaveHeader,
  onSaveHeader,
  onChangeStatus,
  onDelete,
}: DraftActionsProps) {
  const hasNoLines = quote.lines.length === 0;
  const isExpiredDraft = isValidityPassed(quote.validUntil);
  // The API checks the lines first, so the no-lines hint wins when both apply.
  let sendBlockedHint: string | undefined;

  if (hasNoLines) {
    sendBlockedHint = t('quotes.sendNeedsLineHint');
  } else if (isExpiredDraft) {
    sendBlockedHint = t('quotes.errors.validUntilInPast');
  }

  return (
    <>
      {quote.canDelete && <QuoteDeleteButton t={t} isBusy={isSaving || isChangingStatus} onDelete={onDelete} />}
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
        onClick={() => {
          onChangeStatus('Sent');
        }}
        disabled={isSaving || isChangingStatus || hasNoLines || isExpiredDraft}
        aria-busy={isChangingStatus}
        title={sendBlockedHint}
        className={buttonClass}
      >
        <Send className={defaultIconClass} />
        <span>{t('quotes.sendQuote')}</span>
      </button>
    </>
  );
}

interface SentActionsProps {
  readonly t: TFunction;
  readonly isBusy: boolean;
  readonly isChangingStatus: boolean;
  readonly onChangeStatus: (status: QuoteStatus) => void;
}

/** Sent-only actions after close and PDF: reject and accept. */
function SentActions({ t, isBusy, isChangingStatus, onChangeStatus }: SentActionsProps) {
  return (
    <>
      <button
        data-testid="quote-reject-button"
        type="button"
        onClick={() => {
          onChangeStatus('Rejected');
        }}
        disabled={isBusy}
        aria-busy={isChangingStatus}
        className={dangerButtonClass}
      >
        <X className={defaultIconClass} />
        <span>{t('quotes.rejectQuote')}</span>
      </button>
      <button
        data-testid="quote-accept-button"
        type="button"
        onClick={() => {
          onChangeStatus('Accepted');
        }}
        disabled={isBusy}
        aria-busy={isChangingStatus}
        className={buttonClass}
      >
        <Check className={defaultIconClass} />
        <span>{t('quotes.acceptQuote')}</span>
      </button>
    </>
  );
}

export const QuoteEditorFooter = memo(function QuoteEditorFooter({
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

  if (quote.isLocked) {
    return (
      <>
        {closeButton}
        {downloadButton}
        {quote.canDelete && <QuoteDeleteButton t={t} isBusy={isSaving || isChangingStatus} onDelete={onDelete} />}
      </>
    );
  }

  if (quote.status === 'Draft') {
    return (
      <>
        {closeButton}
        {downloadButton}
        <DraftActions
          t={t}
          quote={quote}
          isSaving={isSaving}
          isChangingStatus={isChangingStatus}
          canSaveHeader={canSaveHeader}
          onSaveHeader={onSaveHeader}
          onChangeStatus={onChangeStatus}
          onDelete={onDelete}
        />
      </>
    );
  }

  if (quote.status === 'Sent') {
    return (
      <>
        {closeButton}
        {downloadButton}
        <SentActions t={t} isBusy={isSaving || isChangingStatus} isChangingStatus={isChangingStatus} onChangeStatus={onChangeStatus} />
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

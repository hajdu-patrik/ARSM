/** Footer actions gated by the server lock flag, then by quote status (see the WebUI CLAUDE.md). */
import { memo, useId, type ReactNode } from 'react';
import type { TFunction } from 'i18next';
import { Check, Download, Save, Send, X } from 'lucide-react';
import type { QuoteDetailDto, QuoteStatus } from '../../../types/quotes/quotes.types';
import {
  buttonClass,
  dangerButtonClass,
  defaultIconClass,
  mutedMetaTextClass,
  secondaryButtonClass,
} from '../../../utils/formStyles';
import { isValidityPassed } from '../helpers';
import { QuoteDeleteButton } from './QuoteDeleteButton';

interface QuoteEditorFooterProps {
  readonly t: TFunction;
  readonly quote: QuoteDetailDto | null;
  readonly isSaving: boolean;
  /** The status a pending change moves the quote to, else null; only that button shows its busy label. */
  readonly changingStatusTo: QuoteStatus | null;
  /** Any quote write in flight: the actions stay disabled and the dialog cannot close meanwhile. */
  readonly isBusy: boolean;
  readonly isLoadingQuote: boolean;
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
  readonly isSendingQuote: boolean;
  readonly isBusy: boolean;
  readonly canSaveHeader: boolean;
  readonly sendBlockedHint: string | undefined;
  readonly sendHintId: string;
  readonly onSaveHeader: () => void;
  readonly onChangeStatus: (status: QuoteStatus) => void;
  readonly onDelete: () => void;
}

/** Why a Draft cannot be sent, else undefined; the API checks the lines first, so that reason wins. */
function resolveSendBlockedHint(t: TFunction, quote: QuoteDetailDto): string | undefined {
  if (quote.lines.length === 0) {
    return t('quotes.sendNeedsLineHint');
  }

  return isValidityPassed(quote.validUntil) ? t('quotes.errors.validUntilInPast') : undefined;
}

/** Flows with the footer row, but at 350px and below sits in a 2-column grid so five buttons do not stack tall. */
function FooterActions({ children }: { readonly children: ReactNode }) {
  return (
    <div className="contents max-[350px]:grid max-[350px]:grid-cols-2 max-[350px]:gap-2 max-[350px]:[&>:last-child:nth-child(odd)]:col-span-2">
      {children}
    </div>
  );
}

/** Draft-only actions after close and PDF: delete, save header and send. */
function DraftActions({
  t,
  quote,
  isSaving,
  isSendingQuote,
  isBusy,
  canSaveHeader,
  sendBlockedHint,
  sendHintId,
  onSaveHeader,
  onChangeStatus,
  onDelete,
}: DraftActionsProps) {
  return (
    <>
      {quote.canDelete && <QuoteDeleteButton t={t} isBusy={isBusy} onDelete={onDelete} />}
      <button
        data-testid="quote-save-header-button"
        type="button"
        onClick={onSaveHeader}
        disabled={isBusy || !canSaveHeader}
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
        disabled={isBusy || sendBlockedHint !== undefined}
        aria-busy={isSendingQuote}
        aria-describedby={sendBlockedHint === undefined ? undefined : sendHintId}
        title={sendBlockedHint}
        className={buttonClass}
      >
        <Send className={defaultIconClass} />
        <span>{isSendingQuote ? t('quotes.sendingQuote') : t('quotes.sendQuote')}</span>
      </button>
    </>
  );
}

interface SentActionsProps {
  readonly t: TFunction;
  readonly isBusy: boolean;
  readonly changingStatusTo: QuoteStatus | null;
  readonly onChangeStatus: (status: QuoteStatus) => void;
}

/** Sent-only actions after close and PDF: reject and accept. */
function SentActions({ t, isBusy, changingStatusTo, onChangeStatus }: SentActionsProps) {
  return (
    <>
      <button
        data-testid="quote-reject-button"
        type="button"
        onClick={() => {
          onChangeStatus('Rejected');
        }}
        disabled={isBusy}
        aria-busy={changingStatusTo === 'Rejected'}
        className={dangerButtonClass}
      >
        <X className={defaultIconClass} />
        <span>{changingStatusTo === 'Rejected' ? t('common.actions.saving') : t('quotes.rejectQuote')}</span>
      </button>
      <button
        data-testid="quote-accept-button"
        type="button"
        onClick={() => {
          onChangeStatus('Accepted');
        }}
        disabled={isBusy}
        aria-busy={changingStatusTo === 'Accepted'}
        className={buttonClass}
      >
        <Check className={defaultIconClass} />
        <span>{changingStatusTo === 'Accepted' ? t('common.actions.saving') : t('quotes.acceptQuote')}</span>
      </button>
    </>
  );
}

/** Picks the footer actions for the editor: loading, create, locked, then by quote status. */
export const QuoteEditorFooter = memo(function QuoteEditorFooter({
  t,
  quote,
  isSaving,
  changingStatusTo,
  isBusy,
  isLoadingQuote,
  isDownloadingPdf,
  canSaveHeader,
  onClose,
  onCreate,
  onSaveHeader,
  onChangeStatus,
  onDownloadPdf,
  onDelete,
}: QuoteEditorFooterProps) {
  const sendHintId = useId();
  const closeButton = (
    <button type="button" onClick={onClose} disabled={isBusy} className={secondaryButtonClass}>
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

  if (isLoadingQuote) {
    return closeButton;
  }

  if (!quote) {
    return (
      <>
        {closeButton}
        <button
          data-testid="quote-create-button"
          type="button"
          onClick={onCreate}
          disabled={isBusy}
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
      <FooterActions>
        {closeButton}
        {downloadButton}
        {quote.canDelete && <QuoteDeleteButton t={t} isBusy={isBusy} onDelete={onDelete} />}
      </FooterActions>
    );
  }

  if (quote.status === 'Draft') {
    const sendBlockedHint = resolveSendBlockedHint(t, quote);

    return (
      <>
        <FooterActions>
          {closeButton}
          {downloadButton}
          <DraftActions
            t={t}
            quote={quote}
            isSaving={isSaving}
            isSendingQuote={changingStatusTo === 'Sent'}
            isBusy={isBusy}
            canSaveHeader={canSaveHeader}
            sendBlockedHint={sendBlockedHint}
            sendHintId={sendHintId}
            onSaveHeader={onSaveHeader}
            onChangeStatus={onChangeStatus}
            onDelete={onDelete}
          />
        </FooterActions>
        {sendBlockedHint !== undefined && (
          <p id={sendHintId} data-testid="quote-send-blocked-hint" className={`w-full text-right ${mutedMetaTextClass}`}>
            {sendBlockedHint}
          </p>
        )}
      </>
    );
  }

  if (quote.status === 'Sent') {
    return (
      <FooterActions>
        {closeButton}
        {downloadButton}
        <SentActions t={t} isBusy={isBusy} changingStatusTo={changingStatusTo} onChangeStatus={onChangeStatus} />
      </FooterActions>
    );
  }

  return (
    <FooterActions>
      {closeButton}
      {downloadButton}
    </FooterActions>
  );
});

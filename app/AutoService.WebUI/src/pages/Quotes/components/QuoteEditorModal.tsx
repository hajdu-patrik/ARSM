/** Quote editor shell: sections gated by the server lock flag, then by status (see the WebUI CLAUDE.md). */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Modal } from '../../../components/common/Modal';
import type { QuoteDetailDto } from '../../../types/quotes/quotes.types';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';
import { mutedSecondaryTextClass, warningNoticeSurfaceClass } from '../../../utils/formStyles';
import { canEditQuoteLines, hasQuoteHeaderChanges } from '../helpers';
import type { QuoteEditorState } from '../hooks/useQuoteEditor';
import type { QuoteMutationsState } from '../hooks/useQuoteMutations';
import type { QuoteReferenceData } from '../hooks/useQuoteReferenceData';
import { QuoteEditorHeaderSection } from './QuoteEditorModal.header';
import { QuoteEditorLinesSection } from './QuoteEditorModal.lines';
import { QuoteEditorTotalsSection } from './QuoteEditorModal.totals';
import { QuoteEditorFooter } from './QuoteEditorModal.footer';

/** Body scrolls inside the dialog and fills the height the fit-viewport dialog leaves, so the footer actions stay on screen.
 * The -m-1/p-1 pair nets to zero and leaves room for the 4px focus outline the scroll box would clip. */
const editorBodyClass = '-m-1 min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto p-1';

interface QuoteEditorModalProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly editor: QuoteEditorState;
  readonly mutations: QuoteMutationsState;
  readonly reference: QuoteReferenceData;
}

/** Builds the vehicle label: the quote's own vehicle once it exists, else the looked-up vehicle while drafting. */
function resolveVehicleLabel(
  quote: QuoteDetailDto | null,
  vehicle: VehicleDetailDto | null,
  fallback: string,
): string {
  if (quote) {
    return `${quote.vehicle.licensePlate} - ${quote.vehicle.brand} ${quote.vehicle.model}`;
  }

  return vehicle ? `${vehicle.licensePlate} - ${vehicle.brand} ${vehicle.model}` : fallback;
}

/** Modal that creates a draft or edits an open quote, passing the busy and lock state to its sections. */
export const QuoteEditorModal = memo(function QuoteEditorModal({
  t,
  locale,
  editor,
  mutations,
  reference,
}: QuoteEditorModalProps) {
  const { quote } = editor;
  // The server lock flag wins over the status: a locked quote is view-only in every status.
  const isLocked = quote?.isLocked === true;
  const canEditHeader = !isLocked && (quote === null || quote.status === 'Draft');
  const canChangeValidity = !isLocked && (quote === null || quote.status === 'Draft' || quote.status === 'Sent');
  const canEditLines = canEditQuoteLines(quote);
  const vehicleLabel = resolveVehicleLabel(quote, editor.vehicle, t('quotes.vehicleUnknown'));
  // One busy flag for the header, the lines and the footer: any quote write in flight locks them all.
  const isBusy = mutations.isSavingQuote
    || mutations.isExtendingValidity
    || mutations.isSavingLine
    || mutations.isChangingStatus;
  let modalTitle = t('quotes.newQuote');

  if (editor.isLoadingQuote) {
    modalTitle = t('quotes.loadingQuote');
  } else if (quote) {
    modalTitle = `${quote.quoteNumber} - ${quote.title}`;
  }

  const handleClose = () => {
    if (!isBusy) {
      editor.close();
    }
  };

  return (
    <Modal
      isOpen={editor.isOpen}
      onClose={handleClose}
      title={modalTitle}
      widthClassName="max-w-4xl"
      fitViewport
      footer={(
        <QuoteEditorFooter
          t={t}
          quote={quote}
          isSaving={mutations.isSavingQuote}
          changingStatusTo={mutations.changingStatusTo}
          isBusy={isBusy}
          isLoadingQuote={editor.isLoadingQuote}
          isDownloadingPdf={mutations.isDownloadingPdf}
          canSaveHeader={quote !== null && canEditHeader && hasQuoteHeaderChanges(editor.headerForm, quote)}
          onClose={handleClose}
          onCreate={mutations.handleCreateQuote}
          onSaveHeader={mutations.handleSaveHeader}
          onChangeStatus={mutations.handleChangeStatus}
          onDownloadPdf={() => {
            if (quote) {
              mutations.handleDownloadPdf(quote);
            }
          }}
          onDelete={() => {
            if (quote) {
              mutations.openDeleteModal(quote);
            }
          }}
        />
      )}
    >
      {editor.isLoadingQuote ? (
        <p role="status" className={`py-6 text-center ${mutedSecondaryTextClass}`}>{t('quotes.loadingQuote')}</p>
      ) : (
        <div className={editorBodyClass}>
          <QuoteEditorHeaderSection
            t={t}
            locale={locale}
            quote={quote}
            vehicleLabel={vehicleLabel}
            form={editor.headerForm}
            setForm={editor.setHeaderForm}
            errors={editor.headerErrors}
            appointments={reference.appointments}
            isSaving={isBusy}
            isExtendingValidity={mutations.isExtendingValidity}
            canEditHeader={canEditHeader}
            canChangeValidity={canChangeValidity}
            onSaveValidity={mutations.handleExtendValidity}
          />

          {quote ? (
            <>
              <QuoteEditorLinesSection
                t={t}
                locale={locale}
                quote={quote}
                editingTarget={editor.lineEditingTarget}
                form={editor.lineForm}
                setForm={editor.setLineForm}
                parts={reference.parts}
                laborTypes={reference.laborTypes}
                isSaving={isBusy || reference.isLoadingCatalog}
                canEdit={canEditLines}
                onStartAddLine={editor.startAddLine}
                onStartEditLine={editor.startEditLine}
                onDeleteLine={mutations.handleDeleteLine}
                onSubmitLine={mutations.handleSubmitLine}
                onCancelLineEditing={editor.cancelLineEditing}
              />

              <QuoteEditorTotalsSection t={t} locale={locale} quote={quote} />
            </>
          ) : (
            <p className={warningNoticeSurfaceClass}>{t('quotes.linesAfterCreateNotice')}</p>
          )}
        </div>
      )}
    </Modal>
  );
});

/** Quote editor shell: sections gated by the server lock flag, then by status (draft editable, sent validity-only, decided read-only; see CLAUDE.md). */
import { memo } from 'react';
import type { TFunction } from 'i18next';
import { Modal } from '../../../components/common/Modal';
import type { QuoteDetailDto } from '../../../types/quotes/quotes.types';
import type { VehicleDetailDto } from '../../../types/customers/customers.types';
import { mutedSecondaryTextClass, warningNoticeSurfaceClass } from '../../../utils/formStyles';
import { hasQuoteHeaderChanges } from '../helpers';
import type { QuoteEditorState } from '../hooks/useQuoteEditor';
import type { QuoteMutationsState } from '../hooks/useQuoteMutations';
import type { QuoteReferenceData } from '../hooks/useQuoteReferenceData';
import { QuoteEditorHeaderSection } from './QuoteEditorModal.header';
import { QuoteEditorLinesSection } from './QuoteEditorModal.lines';
import { QuoteEditorTotalsSection } from './QuoteEditorModal.totals';
import { QuoteEditorFooter } from './QuoteEditorModal.footer';

/** Body scrolls inside the dialog (bounded height); unbounded, the modal outgrows the viewport and pushes footer actions off screen. */
const editorBodyClass = 'min-w-0 max-h-[60vh] space-y-4 overflow-y-auto';

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
  const canEditLines = !isLocked && quote !== null && quote.status === 'Draft';
  const vehicleLabel = resolveVehicleLabel(quote, editor.vehicle, t('quotes.vehicleUnknown'));
  const modalTitle = quote ? `${quote.quoteNumber} - ${quote.title}` : t('quotes.newQuote');

  return (
    <Modal
      isOpen={editor.isOpen}
      onClose={editor.close}
      title={modalTitle}
      widthClassName="max-w-4xl"
      footer={(
        <QuoteEditorFooter
          t={t}
          quote={quote}
          isSaving={mutations.isSavingQuote}
          isChangingStatus={mutations.isChangingStatus}
          isDownloadingPdf={mutations.isDownloadingPdf}
          canSaveHeader={quote !== null && canEditHeader && hasQuoteHeaderChanges(editor.headerForm, quote)}
          onClose={editor.close}
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
        <p className={`py-6 text-center ${mutedSecondaryTextClass}`}>{t('quotes.loadingQuote')}</p>
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
            isSaving={mutations.isSavingQuote}
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
                isSaving={mutations.isSavingLine || reference.isLoadingCatalog}
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

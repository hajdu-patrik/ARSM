/**
 * Quote editor modal shell.
 *
 * Holds the header, lines, totals and footer sections and decides, from the
 * quote's status, what the editor still allows: a draft is fully editable, a
 * sent quote only takes a validity extension and a decision, and a decided
 * quote is read-only. The sections are separate files because this modal
 * carries a whole document, the same reason AppointmentDetailModal is split.
 * @module pages/Quotes/components/QuoteEditorModal
 */
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

/**
 * The editor carries a whole document, so its body scrolls inside the dialog:
 * without a bounded height the modal grows past the viewport and the footer
 * actions end up off screen with nothing to scroll.
 */
const editorBodyClass = 'min-w-0 max-h-[60vh] space-y-4 overflow-y-auto';

interface QuoteEditorModalProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly editor: QuoteEditorState;
  readonly mutations: QuoteMutationsState;
  readonly reference: QuoteReferenceData;
}

/**
 * Builds the vehicle label shown in the editor: the quote's own vehicle once
 * it exists, the looked-up vehicle while the draft is still being written.
 * @param quote Quote open in the editor, or null while creating.
 * @param vehicle Vehicle looked up for a new draft.
 * @param fallback Placeholder text when neither is available yet.
 * @returns Vehicle label text.
 */
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

const QuoteEditorModalComponent = memo(function QuoteEditorModal({
  t,
  locale,
  editor,
  mutations,
  reference,
}: QuoteEditorModalProps) {
  const { quote } = editor;
  const canEditHeader = quote === null || quote.status === 'Draft';
  const canChangeValidity = quote === null || quote.status === 'Draft' || quote.status === 'Sent';
  const canEditLines = quote !== null && quote.status === 'Draft';
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
          onCreate={() => void mutations.handleCreateQuote()}
          onSaveHeader={() => void mutations.handleSaveHeader()}
          onChangeStatus={(status) => void mutations.handleChangeStatus(status)}
          onDownloadPdf={() => {
            if (quote) {
              void mutations.handleDownloadPdf(quote);
            }
          }}
          onDelete={() => {
            if (quote) {
              mutations.openDeleteModal({
                id: quote.id,
                quoteNumber: quote.quoteNumber,
                title: quote.title,
                version: quote.version,
              });
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
            appointments={reference.appointments}
            isSaving={mutations.isSavingQuote}
            canEditHeader={canEditHeader}
            canChangeValidity={canChangeValidity}
            onSaveValidity={() => void mutations.handleExtendValidity()}
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
                onDeleteLine={(line) => void mutations.handleDeleteLine(line)}
                onSubmitLine={() => void mutations.handleSubmitLine()}
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

QuoteEditorModalComponent.displayName = 'QuoteEditorModal';

export const QuoteEditorModal = QuoteEditorModalComponent;

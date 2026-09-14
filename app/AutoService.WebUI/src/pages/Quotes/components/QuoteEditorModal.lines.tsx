/**
 * Quote editor lines section: the saved lines, the inline editor for the row
 * being changed, and the add-line action. Lines are only editable while the
 * quote is a draft; afterwards the same rows render read-only.
 * @module pages/Quotes/components/QuoteEditorModal.lines
 */
import { memo, type Dispatch, type SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import { Plus } from 'lucide-react';
import type { LaborTypeDto, PartDto } from '../../../types/catalog/catalog.types';
import { MAX_QUOTE_LINE_COUNT, type QuoteDetailDto, type QuoteLineDto } from '../../../types/quotes/quotes.types';
import {
  compactSectionHeadingTextClass,
  contentCardFrameClass,
  mutedMetaTextClass,
  mutedSecondaryTextClass,
  referenceChipPrimaryButtonClass,
} from '../../../utils/formStyles';
import type { QuoteLineFormState } from '../helpers';
import type { QuoteLineEditingTarget } from '../hooks/useQuoteEditor';
import { QuoteLineEditorRow, quoteLineRowGridClass } from './QuoteLineEditorRow';

interface QuoteEditorLinesSectionProps {
  readonly t: TFunction;
  readonly locale: string;
  readonly quote: QuoteDetailDto;
  readonly editingTarget: QuoteLineEditingTarget;
  readonly form: QuoteLineFormState;
  readonly setForm: Dispatch<SetStateAction<QuoteLineFormState>>;
  readonly parts: PartDto[];
  readonly laborTypes: LaborTypeDto[];
  readonly isSaving: boolean;
  readonly canEdit: boolean;
  readonly onStartAddLine: () => void;
  readonly onStartEditLine: (line: QuoteLineDto) => void;
  readonly onDeleteLine: (line: QuoteLineDto) => void;
  readonly onSubmitLine: () => void;
  readonly onCancelLineEditing: () => void;
}

/**
 * Reports whether a saved line is the one currently open in the inline editor.
 * @param target Row the editor is targeting.
 * @param line Saved line being rendered.
 * @returns True when this row should render as the editor.
 */
function isLineBeingEdited(target: QuoteLineEditingTarget, line: QuoteLineDto): boolean {
  return target?.kind === 'existing' && target.lineId === line.id;
}

const QuoteEditorLinesSectionComponent = memo(function QuoteEditorLinesSection({
  t,
  locale,
  quote,
  editingTarget,
  form,
  setForm,
  parts,
  laborTypes,
  isSaving,
  canEdit,
  onStartAddLine,
  onStartEditLine,
  onDeleteLine,
  onSubmitLine,
  onCancelLineEditing,
}: QuoteEditorLinesSectionProps) {
  const isAddingLine = editingTarget?.kind === 'new';
  const hasReachedLineLimit = quote.lines.length >= MAX_QUOTE_LINE_COUNT;

  return (
    <section className="min-w-0 space-y-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h3 className={compactSectionHeadingTextClass}>{t('quotes.linesTitle')}</h3>
        {canEdit && (
          <button
            data-testid="quote-add-line-button"
            type="button"
            onClick={onStartAddLine}
            disabled={isSaving || isAddingLine || hasReachedLineLimit}
            title={hasReachedLineLimit ? t('quotes.errors.lineLimitExceeded') : undefined}
            className={referenceChipPrimaryButtonClass}
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="truncate">{t('quotes.addLine')}</span>
          </button>
        )}
      </div>

      {isAddingLine && (
        <QuoteLineEditorRow
          t={t}
          locale={locale}
          line={null}
          isEditing
          isSaving={isSaving}
          canEdit={canEdit}
          form={form}
          setForm={setForm}
          parts={parts}
          laborTypes={laborTypes}
          onStartEdit={onStartAddLine}
          onDelete={onCancelLineEditing}
          onSubmit={onSubmitLine}
          onCancel={onCancelLineEditing}
        />
      )}

      <div className={`min-w-0 ${contentCardFrameClass}`}>
        <div className={`hidden ${quoteLineRowGridClass} border-b border-arsm-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-arsm-muted dark:border-arsm-border-dark dark:text-arsm-muted-dark sm:px-3.5`}>
          <span>{t('quotes.line.description')}</span>
          <span className="text-right">{t('quotes.line.quantityShort')}</span>
          <span className="text-right">{t('quotes.line.unitPriceShort')}</span>
          <span className="text-right">{t('quotes.line.vatShort')}</span>
          <span className="text-right">{t('quotes.line.netAmount')}</span>
          <span className="text-right">{t('quotes.line.grossAmount')}</span>
          <span aria-hidden="true" />
        </div>

        {quote.lines.length === 0 && (
          <p data-testid="quote-lines-empty" className={`px-3.5 py-6 text-center ${mutedSecondaryTextClass}`}>{t('quotes.emptyLines')}</p>
        )}

        {quote.lines.length > 0 && (
          <div className="min-w-0 divide-y divide-arsm-border/80 dark:divide-arsm-border-dark/80">
            {quote.lines.map((line) => (
              <QuoteLineEditorRow
                key={line.id}
                t={t}
                locale={locale}
                line={line}
                isEditing={isLineBeingEdited(editingTarget, line)}
                isSaving={isSaving}
                canEdit={canEdit}
                form={form}
                setForm={setForm}
                parts={parts}
                laborTypes={laborTypes}
                onStartEdit={() => onStartEditLine(line)}
                onDelete={() => onDeleteLine(line)}
                onSubmit={onSubmitLine}
                onCancel={onCancelLineEditing}
              />
            ))}
          </div>
        )}
      </div>

      <p className={mutedMetaTextClass}>
        {t('quotes.lineCount', { count: quote.lines.length, max: MAX_QUOTE_LINE_COUNT })}
      </p>
    </section>
  );
});

QuoteEditorLinesSectionComponent.displayName = 'QuoteEditorLinesSection';

export const QuoteEditorLinesSection = QuoteEditorLinesSectionComponent;

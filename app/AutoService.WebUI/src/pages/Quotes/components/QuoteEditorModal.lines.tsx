/**
 * Quote editor lines section: the saved lines, the inline editor for the row
 * being changed, and the add-line action. Lines are only editable while the
 * quote is a draft; afterwards the same rows render read-only and the
 * actions column disappears entirely, from the header down.
 * @module pages/Quotes/components/QuoteEditorModal.lines
 */
import { memo, type Dispatch, type SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import { Plus } from 'lucide-react';
import type { LaborTypeDto, PartDto } from '../../../types/catalog/catalog.types';
import { MAX_QUOTE_LINE_COUNT, type QuoteDetailDto, type QuoteLineDto } from '../../../types/quotes/quotes.types';
import { DataList, type DataListColumn } from '../../../components/common/DataList';
import {
  compactHeaderRowClass,
  compactSectionHeadingTextClass,
  dataListBreakpointClasses,
  defaultIconClass,
  mutedMetaTextClass,
  referenceChipPrimaryButtonClass,
} from '../../../utils/formStyles';
import type { QuoteLineFormState } from '../helpers';
import type { QuoteLineEditingTarget } from '../hooks/useQuoteEditor';
import { QuoteLineForm } from './QuoteLineForm';
import { QuoteLineRow } from './QuoteLineRow';

/** Column grid templates: the actions track only exists while the quote is editable. */
const quoteLineColumnsEditableClass = '@3xl:grid-cols-[minmax(10rem,1.8fr)_minmax(3.5rem,auto)_minmax(6.5rem,auto)_minmax(3rem,auto)_minmax(6.5rem,auto)_minmax(6.5rem,auto)_auto]';
const quoteLineColumnsReadOnlyClass = '@3xl:grid-cols-[minmax(10rem,1.8fr)_minmax(3.5rem,auto)_minmax(6.5rem,auto)_minmax(3rem,auto)_minmax(6.5rem,auto)_minmax(6.5rem,auto)]';

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

  const columns: DataListColumn[] = [
    { key: 'description', label: t('quotes.line.description') },
    { key: 'quantity', label: t('quotes.line.quantityShort'), align: 'right' },
    { key: 'unitPrice', label: t('quotes.line.unitPriceShort'), align: 'right' },
    { key: 'vat', label: t('common.fields.vat'), align: 'right' },
    { key: 'net', label: t('common.fields.net'), align: 'right' },
    { key: 'gross', label: t('common.fields.gross'), align: 'right' },
    ...(canEdit ? [{ key: 'actions', label: '' }] : []),
  ];

  return (
    <section className="min-w-0 space-y-3">
      <div className={compactHeaderRowClass}>
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
            <Plus className={defaultIconClass} />
            <span className="truncate">{t('quotes.addLine')}</span>
          </button>
        )}
      </div>

      {isAddingLine && (
        <QuoteLineForm
          t={t}
          locale={locale}
          isSaving={isSaving}
          form={form}
          setForm={setForm}
          parts={parts}
          laborTypes={laborTypes}
          onSubmit={onSubmitLine}
          onCancel={onCancelLineEditing}
        />
      )}

      <DataList
        breakpoint="3xl"
        columnsClassName={canEdit ? quoteLineColumnsEditableClass : quoteLineColumnsReadOnlyClass}
        columns={columns}
        isEmpty={quote.lines.length === 0}
        emptyText={t('quotes.emptyLines')}
        emptyTestId="quote-lines-empty"
      >
        {quote.lines.map((line) => (
          isLineBeingEdited(editingTarget, line)
            ? (
              <div key={line.id} className={dataListBreakpointClasses['3xl'].fullSpan}>
                <QuoteLineForm
                  t={t}
                  locale={locale}
                  isSaving={isSaving}
                  form={form}
                  setForm={setForm}
                  parts={parts}
                  laborTypes={laborTypes}
                  onSubmit={onSubmitLine}
                  onCancel={onCancelLineEditing}
                />
              </div>
            )
            : (
              <QuoteLineRow
                key={line.id}
                t={t}
                locale={locale}
                line={line}
                canEdit={canEdit}
                isSaving={isSaving}
                onStartEdit={() => onStartEditLine(line)}
                onDelete={() => onDeleteLine(line)}
              />
            )
        ))}
      </DataList>

      <p className={mutedMetaTextClass}>
        {t('quotes.lineCount', { count: quote.lines.length, max: MAX_QUOTE_LINE_COUNT })}
      </p>
    </section>
  );
});

QuoteEditorLinesSectionComponent.displayName = 'QuoteEditorLinesSection';

export const QuoteEditorLinesSection = QuoteEditorLinesSectionComponent;

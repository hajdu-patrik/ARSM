/** List toolbar search field: magnifier, text input and a clear button while it holds text. */
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import {
  defaultIconClass,
  inputGroupContainerClass,
  inputGroupIconClass,
  searchClearButtonClass,
  searchInputClass,
  toolbarSearchFieldClass,
} from '../../utils/formStyles';

interface ToolbarSearchFieldProps {
  /** Prefix of the `-search-input` and `-search-clear` test ids. */
  readonly testIdPrefix: string;
  readonly value: string;
  readonly placeholder: string;
  readonly ariaLabel?: string;
  /** Receives the raw input value; the caller applies its own input filter. */
  readonly onChange: (value: string) => void;
  readonly onClear: () => void;
}

/** Search input shared by the Customers, Quotes, Inventory and mechanic roster toolbars. */
export function ToolbarSearchField({ testIdPrefix, value, placeholder, ariaLabel, onChange, onClear }: ToolbarSearchFieldProps) {
  const { t } = useTranslation();

  return (
    <div className={`${inputGroupContainerClass} ${toolbarSearchFieldClass}`}>
      <Search className={inputGroupIconClass} />
      <input
        data-testid={`${testIdPrefix}-search-input`}
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={searchInputClass}
      />
      {value.length > 0 && (
        <button
          data-testid={`${testIdPrefix}-search-clear`}
          type="button"
          onClick={onClear}
          title={t('common.actions.clearSearch')}
          aria-label={t('common.actions.clearSearch')}
          className={searchClearButtonClass}
        >
          <X className={defaultIconClass} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

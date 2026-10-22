/** Password input with a visibility toggle, used by the change-password form and the admin reset dialog. */

import { Eye, EyeOff } from 'lucide-react';
import type { FieldErrorA11yProps } from '../../utils/fieldA11y';
import { inputClass, inputGroupContainerClass, labelClass, largeIconClass, mutedMetaTextClass, passwordToggleButtonClass } from '../../utils/formStyles';
import { FieldErrorText } from './FieldErrorText';

interface PasswordInputWithToggleProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly placeholder: string;
  readonly isVisible: boolean;
  readonly isSubmitting: boolean;
  readonly isLocked: boolean;
  readonly onChange: (value: string) => void;
  readonly onFocus: () => void;
  readonly onToggleVisibility: () => void;
  readonly inputName: string;
  readonly toggleAriaLabel: string;
  readonly hintText?: string;
  /** `aria-invalid` and `aria-describedby` of the field, pointing at whichever error text is on screen. */
  readonly a11yProps: FieldErrorA11yProps;
  /** Id of this field's own server error text, shown under the input while `errorKey` is set. */
  readonly errorId: string;
  readonly errorKey: string | undefined;
}

/** Renders a controlled password input with lock/autofill-safe attributes. */
export function PasswordInputWithToggle({
  id,
  label,
  value,
  placeholder,
  isVisible,
  isSubmitting,
  isLocked,
  onChange,
  onFocus,
  onToggleVisibility,
  inputName,
  toggleAriaLabel,
  hintText,
  a11yProps,
  errorId,
  errorKey,
}: PasswordInputWithToggleProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className={inputGroupContainerClass}>
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onFocus={onFocus}
          placeholder={placeholder}
          className={`${inputClass} pr-12`}
          disabled={isSubmitting}
          autoComplete="off"
          readOnly={isLocked}
          name={inputName}
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
          spellCheck={false}
          {...a11yProps}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className={passwordToggleButtonClass}
          aria-label={toggleAriaLabel}
        >
          {isVisible ? <EyeOff className={largeIconClass} /> : <Eye className={largeIconClass} />}
        </button>
      </div>
      <FieldErrorText id={errorId} messageKey={errorKey} />
      {hintText ? <p className={`mt-1 ${mutedMetaTextClass}`}>{hintText}</p> : null}
    </div>
  );
}

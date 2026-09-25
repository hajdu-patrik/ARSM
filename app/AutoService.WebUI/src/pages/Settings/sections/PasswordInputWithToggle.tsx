/**
 * Password input with a visibility toggle used by Settings forms.
 * @module pages/Settings/sections/PasswordInputWithToggle
 */

import { Eye, EyeOff } from 'lucide-react';
import { inputClass, inputGroupContainerClass, labelClass, mutedMetaTextClass, passwordToggleButtonClass } from '../constants';
import { largeIconClass } from '../../../utils/formStyles';

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
          onChange={(event) => onChange(event.target.value)}
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
      {hintText ? <p className={`mt-1 ${mutedMetaTextClass}`}>{hintText}</p> : null}
    </div>
  );
}

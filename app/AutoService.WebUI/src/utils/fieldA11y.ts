/** Programmatic field-error binding (WCAG 3.3.1): the error text element carries `id={errorId}`,
 * the id coming from React `useId()`. See app/AutoService.WebUI/CLAUDE.md. */

/** ARIA attributes spread onto a validated field; empty when the field has no error. */
export interface FieldErrorA11yProps {
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

/** Marks a field invalid and points it at its visible error text while `error` is truthy. */
export function fieldErrorA11yProps(errorId: string, error: string | null | undefined | false): FieldErrorA11yProps {
  return error ? { 'aria-invalid': true, 'aria-describedby': errorId } : {};
}

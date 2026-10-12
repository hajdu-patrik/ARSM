/** One selectable entry of the shared Dropdown; values are strings (callers map numbers). */
export interface DropdownOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

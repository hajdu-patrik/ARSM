/** Pure index helpers for Dropdown keyboard navigation (disabled options are never returned) and the option element id. */
import type { DropdownOption } from './dropdown.types';

export function getDropdownOptionId(listboxId: string, index: number): string {
  return `${listboxId}-option-${String(index)}`;
}

export function firstEnabledIndex(options: readonly DropdownOption[]): number {
  return options.findIndex((option) => option.disabled !== true);
}

export function lastEnabledIndex(options: readonly DropdownOption[]): number {
  for (let index = options.length - 1; index >= 0; index -= 1) {
    if (options[index]?.disabled !== true) {
      return index;
    }
  }
  return -1;
}

/** Next enabled index in the direction, stopping at the ends; from -1 it starts at the first or last. */
export function stepEnabledIndex(options: readonly DropdownOption[], from: number, direction: 1 | -1): number {
  if (from < 0) {
    return direction === 1 ? firstEnabledIndex(options) : lastEnabledIndex(options);
  }

  for (let index = from + direction; index >= 0 && index < options.length; index += direction) {
    if (options[index]?.disabled !== true) {
      return index;
    }
  }
  return from;
}

/** Index of the next enabled option whose label starts with the typed text; a repeated single key cycles. */
export function findTypeAheadIndex(options: readonly DropdownOption[], typed: string, from: number): number {
  const needle = typed.toLocaleLowerCase();
  const chars = Array.from(needle);
  const firstChar = chars[0] ?? '';
  const isCycling = chars.every((char) => char === firstChar);
  const prefix = isCycling ? firstChar : needle;
  const start = isCycling ? from + 1 : Math.max(from, 0);

  for (let offset = 0; offset < options.length; offset += 1) {
    const index = (start + offset) % options.length;
    const option = options[index];
    if (option?.disabled !== true && option?.label.toLocaleLowerCase().startsWith(prefix) === true) {
      return index;
    }
  }
  return -1;
}

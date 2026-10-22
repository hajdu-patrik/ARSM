/** Shared input validation/filtering: character-level filters for name and phone
 * fields, the password length floor and file extension validation for profile picture uploads. */

/** Shortest password the API accepts (the first rule of the password hint shown beside every password field). */
export const MIN_PASSWORD_LENGTH = 8;

/** Strip everything except Unicode letters and hyphens from name input (create/edit forms, backend NamePattern). */
export function filterNameInput(value: string): string {
  return value.replaceAll(/[^\p{L}-]/gu, '');
}

/** Strip everything except Unicode letters, hyphens, spaces and apostrophes (' and U+2019): name search fields only. */
export function filterNameSearchInput(value: string): string {
  return value.replaceAll(/[^\p{L}' \u2019-]/gu, '');
}

/** Strip everything except digits and common phone special characters (+, -, (, ), space). */
export function filterPhoneInput(value: string): string {
  return value.replaceAll(/[^\d+\-()\s]/g, '');
}

/** Set of allowed file extensions for profile picture uploads. */
const ALLOWED_PICTURE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

/** Check whether a filename has an allowed image extension. */
export function isAllowedPictureExtension(fileName: string): boolean {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) return false;
  return ALLOWED_PICTURE_EXTENSIONS.has(fileName.slice(dotIndex).toLowerCase());
}

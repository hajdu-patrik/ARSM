/**
 * Shared input validation and filtering utilities.
 *
 * Provides character-level input filters for name and phone fields,
 * and file extension validation for profile picture uploads.
 * @module utils/validation
 */

/** Strip everything except Unicode letters and hyphens from name input. */
export function filterNameInput(value: string): string {
  return value.replace(/[^\p{L}\-]/gu, '');
}

/** Strip everything except digits and common phone special characters (+, -, (, ), space). */
export function filterPhoneInput(value: string): string {
  return value.replace(/[^\d+\-()\s]/g, '');
}

/** Set of allowed file extensions for profile picture uploads. */
const ALLOWED_PICTURE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

/** Check whether a filename has an allowed image extension. */
export function isAllowedPictureExtension(fileName: string): boolean {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) return false;
  return ALLOWED_PICTURE_EXTENSIONS.has(fileName.slice(dotIndex).toLowerCase());
}

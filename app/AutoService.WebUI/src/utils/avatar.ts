/**
 * Deterministic avatar fallback utilities.
 *
 * Provides consistent color selection and initials generation for users
 * without profile pictures. Color is determined by a hash of the seed value,
 * selecting from a fixed ARSM token palette.
 * @module utils/avatar
 */

/** Fixed palette of ARSM token class pairs for avatar backgrounds. */
const AVATAR_COLOR_CLASSES = [
  'bg-arsm-accent text-arsm-primary dark:bg-arsm-accent-dark dark:text-arsm-hover',
  'bg-arsm-accent-subtle text-arsm-accent-vivid dark:bg-arsm-hover-dark dark:text-arsm-accent',
  'bg-arsm-warning-bg text-arsm-warning-text dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark',
  'bg-arsm-success-bg text-arsm-success-text dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark',
  'bg-arsm-error-bg text-arsm-error-text dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light',
  'bg-arsm-toggle-bg text-arsm-label dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark',
  'bg-arsm-input text-arsm-primary dark:bg-arsm-input-dark dark:text-arsm-primary-dark',
  'bg-arsm-accent-wash text-arsm-accent-deep dark:bg-arsm-hover-dark dark:text-arsm-accent',
  'bg-arsm-success-soft text-arsm-success-text dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark',
  'bg-arsm-error-softest text-arsm-error-text dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light',
] as const;

/**
 * Computes a deterministic hash from a string seed using djb2 XOR variant.
 * @param seed - The string to hash.
 * @returns A positive integer hash value.
 */
function hashSeed(seed: string): number {
  let hash = 5381;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33) ^ (seed.codePointAt(index) ?? 0);
  }

  return Math.abs(hash);
}

/**
 * Returns a deterministic Tailwind color class pair for an avatar based on a seed value.
 * The same seed always produces the same color.
 * @param seedValue - A unique identifier (e.g., person ID or email) to derive the color from.
 * @returns A Tailwind CSS class string for background and text color.
 */
export function getDeterministicAvatarColor(seedValue: string | number | null | undefined): string {
  const seed = String(seedValue ?? 'anonymous');
  const hash = hashSeed(seed);
  return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length];
}

/**
 * Generates avatar initials from a user's name or email.
 * Prefers first+last name initials, falls back to the first two characters of the email.
 * @param firstName - User's first name.
 * @param lastName - User's last name.
 * @param email - User's email address (fallback).
 * @returns One or two uppercase characters for the avatar, or {@code "??"} if no data is available.
 */
export function getAvatarInitials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const fromName = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim().toUpperCase();
  if (fromName.length > 0) {
    return fromName;
  }

  const fromEmail = email?.slice(0, 2).toUpperCase();
  return fromEmail && fromEmail.length > 0 ? fromEmail : '??';
}

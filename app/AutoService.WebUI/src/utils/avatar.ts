/**
 * Deterministic avatar fallback utilities.
 *
 * Provides consistent color selection and initials generation for users
 * without profile pictures. Color is determined by a hash of the seed value,
 * selecting from a fixed 10-color Tailwind palette.
 * @module utils/avatar
 */

/** Fixed palette of 10 Tailwind color class pairs for avatar backgrounds. */
const AVATAR_COLOR_CLASSES = [
  'bg-rose-300 text-rose-900',
  'bg-orange-300 text-orange-900',
  'bg-amber-300 text-amber-900',
  'bg-lime-300 text-lime-900',
  'bg-emerald-300 text-emerald-900',
  'bg-teal-300 text-teal-900',
  'bg-cyan-300 text-cyan-900',
  'bg-sky-300 text-sky-900',
  'bg-indigo-300 text-indigo-900',
  'bg-fuchsia-300 text-fuchsia-900',
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

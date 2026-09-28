/** Deterministic avatar fallback utilities: consistent color and initials for users
 * without profile pictures, color chosen by hashing the seed into a fixed palette. */

/** Fixed palette of theme-invariant ARSM token class pairs for fallback avatar surfaces. */
const AVATAR_COLOR_CLASSES = [
  'bg-arsm-accent text-arsm-primary',
  'bg-arsm-accent-subtle text-arsm-accent-vivid',
  'bg-arsm-warning-bg text-arsm-warning-text',
  'bg-arsm-success-bg text-arsm-success-text',
  'bg-arsm-error-bg text-arsm-error-text',
  'bg-arsm-toggle-bg text-arsm-label',
  'bg-arsm-input text-arsm-primary',
  'bg-arsm-accent-wash text-arsm-accent-deep',
  'bg-arsm-success-soft text-arsm-success-text',
  'bg-arsm-error-softest text-arsm-error-text',
] as const;

/** Computes a deterministic hash from a string seed using a djb2 XOR variant. */
function hashSeed(seed: string): number {
  let hash = 5381;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33) ^ (seed.codePointAt(index) ?? 0);
  }

  return Math.abs(hash);
}

/** Returns a deterministic Tailwind color class pair for an avatar based on a seed value; the same seed always produces the same color. */
export function getDeterministicAvatarColor(seedValue: string | number | null | undefined): string {
  const seed = String(seedValue ?? 'anonymous');
  const hash = hashSeed(seed);
  return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length];
}

/** Generates avatar initials from a user's name or email: prefers first+last initials,
 * falls back to the first two characters of the email, or `"??"` if neither is available. */
export function getAvatarInitials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const fromName = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim().toUpperCase();
  if (fromName.length > 0) {
    return fromName;
  }

  const fromEmail = email?.slice(0, 2).toUpperCase();
  return fromEmail && fromEmail.length > 0 ? fromEmail : '??';
}

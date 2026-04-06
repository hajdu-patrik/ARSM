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

function hashSeed(seed: string): number {
  let hash = 5381;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(index);
  }

  return Math.abs(hash);
}

export function getDeterministicAvatarColor(seedValue: string | number | null | undefined): string {
  const seed = String(seedValue ?? 'anonymous');
  const hash = hashSeed(seed);
  return AVATAR_COLOR_CLASSES[hash % AVATAR_COLOR_CLASSES.length];
}

export function getAvatarInitials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const fromName = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.trim().toUpperCase();
  if (fromName.length > 0) {
    return fromName;
  }

  const fromEmail = email?.slice(0, 2).toUpperCase();
  return fromEmail && fromEmail.length > 0 ? fromEmail : '??';
}

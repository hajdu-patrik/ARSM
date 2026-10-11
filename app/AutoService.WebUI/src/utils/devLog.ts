/** Error logging that never leaks details in production: DEV logs the whole error, production
 * only the context and the error name. See app/AutoService.WebUI/CLAUDE.md. */

/** Name of a thrown value; the message, stack and payload are never read. */
function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

/** Logs an error under a context label (`[context]`); production prints only `[context] <error name>`. */
export function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
    return;
  }

  console.error(`[${context}] ${errorName(error)}`);
}

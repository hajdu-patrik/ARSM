/** Resolves once the mutation settled, success or failure; a failure was already reported by its onError. */
export async function settle(mutation: Promise<unknown>): Promise<void> {
  try {
    await mutation;
  } catch {
    // The onError of the mutation reported the failure.
  }
}

/** Simulates another user saving a record first: the mock state then holds the changed record under its next
 * version, so a request that still carries the old version meets the API's 409. */
import type { MockApiState } from './test-data';

/** Replaces the record with the given id by a changed copy with the next version. */
function changeElsewhere<T extends { readonly id: number; readonly version: number }>(
  records: T[],
  id: number,
  changes: Partial<T>,
): void {
  const index = records.findIndex((record) => record.id === id);
  const record = records[index];

  if (record === undefined) {
    throw new Error(`Unknown mock record ${String(id)}.`);
  }

  records[index] = { ...record, ...changes, version: record.version + 1 };
}

export function renamePartElsewhere(state: MockApiState, id: number, name: string): void {
  changeElsewhere(state.parts, id, { name });
}

export function renameLaborTypeElsewhere(state: MockApiState, id: number, name: string): void {
  changeElsewhere(state.laborTypes, id, { name });
}

export function changeTaskElsewhere(state: MockApiState, id: number, taskDescription: string): void {
  changeElsewhere(state.appointments, id, { taskDescription });
}

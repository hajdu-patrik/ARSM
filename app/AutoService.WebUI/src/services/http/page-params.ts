import type { PagedQuery } from '../../types/common/pagination.types';

/** Query parameters of a paged list read; a blank search term is left out. */
export function toPageParams({ page, pageSize, search }: PagedQuery): Record<string, number | string> {
  const term = search?.trim() ?? '';
  return term.length > 0 ? { page, pageSize, search: term } : { page, pageSize };
}

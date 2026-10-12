/** Server-side paging contract shared by every paged list endpoint (page is 1-based). */
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface PagedQuery {
  page: number;
  pageSize: number;
  search?: string;
  sortDirection?: 'asc' | 'desc';
}

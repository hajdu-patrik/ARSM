import { useState } from 'react';
import { useDebouncedValue } from './useDebouncedValue';

/** Search term, its debounced value and the page; the page falls back to 1 whenever the debounced search changes. */
export function useListPaging() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm);
  const [page, setPageState] = useState(1);
  const [pagedSearch, setPagedSearch] = useState(debouncedSearch);

  // Resetting during render (not in an effect) keeps the stale page from ever being requested.
  if (pagedSearch !== debouncedSearch) {
    setPagedSearch(debouncedSearch);
    setPageState(1);
  }

  const setPage = (nextPage: number) => {
    setPageState(Math.max(1, nextPage));
  };

  return { searchTerm, setSearchTerm, debouncedSearch, page: pagedSearch === debouncedSearch ? page : 1, setPage };
}

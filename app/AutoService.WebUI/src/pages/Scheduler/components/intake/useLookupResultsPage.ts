import { useState } from 'react';

/** Lookup suggestions shown per page. */
export const LOOKUP_RESULTS_PAGE_SIZE = 5;

/** Pages a result set; a new set starts at page 1. */
export function useLookupResultsPage<T>(results: T[]) {
	const [pageState, setPageState] = useState({ page: 1, results });
	const totalPages = Math.max(1, Math.ceil(results.length / LOOKUP_RESULTS_PAGE_SIZE));
	const page = pageState.results === results ? Math.min(pageState.page, totalPages) : 1;
	const pageResults = results.slice((page - 1) * LOOKUP_RESULTS_PAGE_SIZE, page * LOOKUP_RESULTS_PAGE_SIZE);

	return {
		page,
		pageResults,
		setPage: (nextPage: number) => {
			setPageState({ page: nextPage, results });
		},
	};
}

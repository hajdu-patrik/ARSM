import type { CustomerListItem } from '../../../types/customers/customers.types';
import { normalizeSearchValue } from '../../../utils/textSearch';
import { buildCustomerDisplayName } from '../helpers';
import type { SortDirection } from '../page.types';

/** Keeps the customers whose name or one of their license plates contains the normalized search term. */
export function filterCustomersBySearch(
  customers: CustomerListItem[],
  normalizedSearchTerm: string,
): CustomerListItem[] {
  if (normalizedSearchTerm.length === 0) {
    return customers;
  }

  return customers.filter((customer) => {
    const nameMatches = normalizeSearchValue(buildCustomerDisplayName(customer)).includes(normalizedSearchTerm);
    const plateMatches = customer.vehicleLicensePlates.some((plate) => (
      normalizeSearchValue(plate).includes(normalizedSearchTerm)
    ));

    return nameMatches || plateMatches;
  });
}

/** Sorts a copy of the customers by display name in the given direction; equal names order by vehicle count. */
export function sortCustomersByName(
  customers: CustomerListItem[],
  collator: Intl.Collator,
  direction: SortDirection,
): CustomerListItem[] {
  const directionMultiplier = direction === 'asc' ? 1 : -1;

  return [...customers].sort((left, right) => {
    const nameComparison = collator.compare(buildCustomerDisplayName(left), buildCustomerDisplayName(right));

    return nameComparison === 0
      ? left.vehicleCount - right.vehicleCount
      : nameComparison * directionMultiplier;
  });
}

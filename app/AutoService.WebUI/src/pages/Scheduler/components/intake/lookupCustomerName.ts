import type { SchedulerCustomerLookupDto } from '../../../../types/scheduler/scheduler.types';

/** Joins the non-blank first, middle and last name parts of a lookup result. */
export function getLookupCustomerName(customer: SchedulerCustomerLookupDto): string {
	return [customer.firstName, customer.middleName, customer.lastName]
		.filter((part): part is string => Boolean(part && part.trim().length > 0))
		.join(' ');
}

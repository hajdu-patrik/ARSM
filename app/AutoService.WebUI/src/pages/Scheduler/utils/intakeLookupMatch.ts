/** Client-side re-check of the intake lookup results, with the same matching rules as `GET /api/customers/by-name`. */
import type { SchedulerCustomerLookupDto } from '../../../types/scheduler/scheduler.types';

/** A plate without spaces and hyphens, upper-cased: "nxe 441" and "NXE-441" both become "NXE441". */
function compactPlate(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase();
}

/** True when the plate contains the typed plate, ignoring case, spaces and hyphens, or no plate was typed. */
export function plateMatchesLookup(licensePlate: string, typedPlate: string): boolean {
  const query = compactPlate(typedPlate);
  return query.length === 0 || compactPlate(licensePlate).includes(query);
}

/** True when a name part or the "first [middle] last" / "last first [middle]" form contains the typed name. */
function nameMatchesLookup(customer: SchedulerCustomerLookupDto, typedName: string): boolean {
  const query = typedName.trim().toUpperCase();
  if (query.length === 0) {
    return true;
  }

  const { firstName, middleName, lastName } = customer;
  const middle = middleName?.trim() ? [middleName] : [];
  const forms = [
    firstName,
    ...middle,
    lastName,
    `${firstName} ${lastName}`,
    `${lastName} ${firstName}`,
    ...middle.map((value) => `${firstName} ${value} ${lastName}`),
    ...middle.map((value) => `${lastName} ${firstName} ${value}`),
  ];

  return forms.some((form) => form.toUpperCase().includes(query));
}

/** True when the plate field is typed and one plate matches; else the name field, or the plate-like name text, matches. */
export function customerMatchesLookup(customer: SchedulerCustomerLookupDto, typedName: string, typedPlate: string): boolean {
  const hasPlate = typedPlate.trim().length > 0;
  const plateMatches = (query: string) => customer.vehicles.some((vehicle) => plateMatchesLookup(vehicle.licensePlate, query));

  if (hasPlate) {
    return plateMatches(typedPlate) && nameMatchesLookup(customer, typedName);
  }

  // The server also matches the typed name against plates, so those results stay.
  return nameMatchesLookup(customer, typedName) || plateMatches(typedName);
}

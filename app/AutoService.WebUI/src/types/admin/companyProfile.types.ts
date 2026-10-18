/** Company profile contract of {@code /api/admin/company-profile}: the letterhead printed on the quote PDF. */

/** The seven letterhead fields, read by GET and written by PUT (the server returns the normalized stored row). */
export interface CompanyProfileDto {
  /** Company name. */
  name: string;
  /** Street and house number. */
  addressLine: string;
  /** Four-digit postal code. */
  postalCode: string;
  /** City. */
  city: string;
  /** Tax number in the 12345678-1-12 format. */
  taxNumber: string;
  /** Phone number. */
  phoneNumber: string;
  /** Email address. */
  email: string;
}

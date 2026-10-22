/** Company profile contract of `/api/admin/company-profile`: the letterhead printed on the quote PDF. */

/** The seven letterhead fields, read by GET and written by PUT (the server returns the normalized stored row). */
export interface CompanyProfileDto {
  name: string;
  addressLine: string;
  /** Four-digit postal code. */
  postalCode: string;
  city: string;
  /** Tax number in the 12345678-1-12 format. */
  taxNumber: string;
  phoneNumber: string;
  email: string;
}

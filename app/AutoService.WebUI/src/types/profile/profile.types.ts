/** Profile API request/response contracts: viewing, updating, password changes, account deletion. */

/** Full profile of the currently authenticated user, returned by {@code GET /api/profile}. */
export interface ProfileData {
  /** Unique identifier for the person. */
  personId: number;
  /** Type of person (e.g. "mechanic"). */
  personType: string;
  /** First name. */
  firstName: string;
  /** Middle name, or {@code null} if not set. */
  middleName: string | null;
  /** Last name. */
  lastName: string;
  /** Email address. */
  email: string;
  /** Phone number, or {@code null} if not set. */
  phoneNumber: string | null;
  /** Whether the user has an uploaded profile picture. */
  hasProfilePicture: boolean;
}

/** Request payload for {@code PUT /api/profile}; all fields optional, only provided ones are updated. */
export interface UpdateProfileRequest {
  /** Updated first name. */
  firstName?: string;
  /** Updated last name. */
  lastName?: string;
  /** Updated email address. */
  email?: string;
  /** Updated phone number. */
  phoneNumber?: string;
  /** Updated middle name. */
  middleName?: string;
}

/** Request payload for changing the user's password ({@code POST /api/profile/change-password}). */
export interface ChangePasswordRequest {
  /** The user's current password for verification. */
  currentPassword: string;
  /** The desired new password (minimum 8 characters). */
  newPassword: string;
  /** Confirmation of the new password — must match {@link newPassword}. */
  confirmNewPassword: string;
}

/** Request payload for deleting the user's profile ({@code DELETE /api/profile}). */
export interface DeleteProfileRequest {
  /** The user's current password for verification before deletion. */
  currentPassword: string;
}

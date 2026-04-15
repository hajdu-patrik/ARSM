/**
 * Profile API request and response types.
 *
 * Defines the contracts for profile management operations including
 * viewing, updating, password changes, and account deletion.
 * @module profile/profile.types
 */

/**
 * Profile data returned by the profile endpoint ({@code GET /api/profile}).
 * Represents the full profile of the currently authenticated user.
 */
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

/**
 * Request payload for updating profile information ({@code PUT /api/profile}).
 * All fields are optional — only provided fields are updated.
 */
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

/**
 * Request payload for changing the user's password ({@code POST /api/profile/change-password}).
 */
export interface ChangePasswordRequest {
  /** The user's current password for verification. */
  currentPassword: string;
  /** The desired new password (minimum 8 characters). */
  newPassword: string;
  /** Confirmation of the new password — must match {@link newPassword}. */
  confirmNewPassword: string;
}

/**
 * Request payload for deleting the user's profile ({@code DELETE /api/profile}).
 */
export interface DeleteProfileRequest {
  /** The user's current password for verification before deletion. */
  currentPassword: string;
}

/** Profile API request/response contracts: viewing, updating, password changes, account deletion. */

/** Full profile of the currently authenticated user, returned by `GET /api/profile`. */
export interface ProfileData {
  personId: number;
  /** Type of person (e.g. "mechanic"). */
  personType: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  hasProfilePicture: boolean;
}

/** Request payload for `PUT /api/profile`; all fields optional, only provided ones are updated. */
export interface UpdateProfileRequest {
  firstName?: string | undefined;
  lastName?: string | undefined;
  email?: string | undefined;
  phoneNumber?: string | undefined;
  middleName?: string | undefined;
}

/** Request payload for changing the user's password (`POST /api/profile/change-password`). */
export interface ChangePasswordRequest {
  currentPassword: string;
  /** The desired new password (minimum 8 characters). */
  newPassword: string;
  /** Confirmation of the new password — must match {@link newPassword}. */
  confirmNewPassword: string;
}

/** Request payload for deleting the user's profile (`DELETE /api/profile`). */
export interface DeleteProfileRequest {
  currentPassword: string;
}

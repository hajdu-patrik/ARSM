/** Login request payload supporting email or phone number authentication; an undefined field is simply left out of the JSON. */
export interface LoginRequest {
  email?: string | undefined;
  phoneNumber?: string | undefined;
  password: string;
}

export interface LoginResponse {
  personId: number;
  isAdmin: boolean;
  /** True while the account still has the temporary password an administrator set. */
  mustChangePassword: boolean;
}

export interface ValidateTokenResponse {
  personId: number;
  isAdmin: boolean;
  mustChangePassword: boolean;
}

export interface AuthUser {
  personId: number;
  isAdmin: boolean;
  /** While true, the guards keep the user on the change-password page. */
  mustChangePassword: boolean;
}

/** Login request payload supporting email or phone number authentication; an undefined field is simply left out of the JSON. */
export interface LoginRequest {
  email?: string | undefined;
  phoneNumber?: string | undefined;
  password: string;
}

/** Response returned after successful login. */
export interface LoginResponse {
  personId: number;
  isAdmin: boolean;
}

/** Response returned by token validation endpoint. */
export interface ValidateTokenResponse {
  personId: number;
  isAdmin: boolean;
}

/** Authenticated user representation in the frontend auth store. */
export interface AuthUser {
  personId: number;
  isAdmin: boolean;
}

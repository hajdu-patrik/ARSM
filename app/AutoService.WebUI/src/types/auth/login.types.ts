/** Login request payload supporting email or phone number authentication. */
export interface LoginRequest {
  email?: string;
  phoneNumber?: string;
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

/** JWT access token claims structure. */
export interface JwtPayload {
  sub: string;
  email: string;
  person_id: number;
  person_type: string;
  exp: number;
  iat: number;
  iss: string;
  aud: string;
}

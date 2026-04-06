/**
 * API request/response types
 */

export interface LoginRequest {
  email?: string;
  phoneNumber?: string;
  password: string;
}

export interface LoginResponse {
  expiresAtUtc: string;
  personId: number;
  personType: string;
  email: string;
  isAdmin: boolean;
}

export interface RefreshResponse {
  expiresAtUtc: string;
}

export interface ValidateTokenResponse {
  personId: number;
  personType: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthUser {
  personId: number;
  personType: string;
  email: string;
  isAdmin: boolean;
  expiresAt?: Date;
}

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

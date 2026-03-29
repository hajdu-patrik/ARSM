/**
 * API request/response types
 */

export interface LoginRequest {
  email?: string;
  phoneNumber?: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAtUtc: string;
  personId: number;
  personType: string;
  email: string;
}

export interface AuthUser {
  personId: number;
  personType: string;
  email: string;
  token: string;
  expiresAt: Date;
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

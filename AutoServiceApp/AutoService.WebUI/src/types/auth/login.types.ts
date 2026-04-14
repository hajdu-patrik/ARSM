/**
 * Authentication API request and response types.
 *
 * Defines the contracts between the frontend and backend authentication endpoints
 * including login, token refresh, session validation, and JWT payload structures.
 * @module auth/login.types
 */

/**
 * Request payload for the login endpoint ({@code POST /api/auth/login}).
 * Either {@link email} or {@link phoneNumber} must be provided as the identifier.
 */
export interface LoginRequest {
  /** Email address used as the login identifier. */
  email?: string;
  /** Phone number used as the login identifier (Hungarian format). */
  phoneNumber?: string;
  /** Account password. */
  password: string;
}

/**
 * Response payload returned on successful login.
 * Contains the authenticated user's profile summary and session expiry.
 */
export interface LoginResponse {
  /** UTC timestamp indicating when the session/token expires. */
  expiresAtUtc: string;
  /** Unique identifier for the authenticated person. */
  personId: number;
  /** Type of person (e.g. "mechanic"). */
  personType: string;
  /** Email address of the authenticated user. */
  email: string;
  /** Whether the authenticated user has admin privileges. */
  isAdmin: boolean;
}

/**
 * Response payload returned by the token refresh endpoint ({@code POST /api/auth/refresh}).
 */
export interface RefreshResponse {
  /** UTC timestamp indicating when the refreshed session expires. */
  expiresAtUtc: string;
}

/**
 * Response payload returned by the session validation endpoint ({@code GET /api/auth/validate}).
 * Used to restore auth state from a cookie-backed session.
 */
export interface ValidateTokenResponse {
  /** Unique identifier for the validated person. */
  personId: number;
  /** Type of person (e.g. "mechanic"). */
  personType: string;
  /** Email address of the validated user. */
  email: string;
  /** Whether the validated user has admin privileges. */
  isAdmin: boolean;
}

/**
 * Client-side representation of the authenticated user.
 * Stored in the auth Zustand store and used throughout the application.
 */
export interface AuthUser {
  /** Unique identifier for the person. */
  personId: number;
  /** Type of person (e.g. "mechanic"). */
  personType: string;
  /** Email address of the user. */
  email: string;
  /** Whether the user has admin privileges. */
  isAdmin: boolean;
  /** Optional session expiry date, set after login. */
  expiresAt?: Date;
}

/**
 * Decoded JWT token payload structure.
 * Represents the claims embedded in the authentication token.
 */
export interface JwtPayload {
  /** Subject claim — typically the identity user ID. */
  sub: string;
  /** Email claim. */
  email: string;
  /** Custom claim for the person's unique ID. */
  person_id: number;
  /** Custom claim for the person type. */
  person_type: string;
  /** Expiration time (Unix timestamp in seconds). */
  exp: number;
  /** Issued-at time (Unix timestamp in seconds). */
  iat: number;
  /** Token issuer. */
  iss: string;
  /** Token audience. */
  aud: string;
}

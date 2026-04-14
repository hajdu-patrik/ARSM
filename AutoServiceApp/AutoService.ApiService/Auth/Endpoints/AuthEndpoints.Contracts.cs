/**
 * AuthEndpoints.Contracts.cs
 *
 * Auto-generated documentation header for this source file.
 */

namespace AutoService.ApiService.Auth.Endpoints;

/**
 * Backend type for API logic in this file.
 */
public static partial class AuthEndpoints
{
    // ─── DTO contracts ────────────────────────────────────────────────────────

    /** POST /api/auth/register request body. Mechanic-only; Customer is not supported. */
    internal sealed record RegisterRequest(
        string PersonType,       // Must be "Mechanic".
        string FirstName,
        string? MiddleName,      // Optional.
        string LastName,
        string Email,
        string Password,         // Must satisfy Identity password policy (>=8 chars, digit, upper, lower, special).
        string? PhoneNumber,     // Optional.
        string? Specialization,  // Required for Mechanic; must match SpecializationType enum.
        IReadOnlyList<string>? Expertise); // Required for Mechanic; 1..10 unique ExpertiseType values.

    /** Returned after a successful registration with identity and domain record IDs. */
    internal sealed record RegisterResponse(string IdentityUserId, int PersonId, string PersonType, string Email);

    /** POST /api/auth/login request body. Supply either Email or PhoneNumber and Password. */
    internal sealed record LoginRequest(string? Email, string? PhoneNumber, string Password);

    /** Returned after a successful login when auth cookies were set. */
    internal sealed record LoginResponse(DateTime ExpiresAtUtc, int PersonId, string PersonType, string Email, bool IsAdmin);

    /** Returned after a successful refresh when new auth cookies were set. */
    internal sealed record RefreshResponse(DateTime ExpiresAtUtc, int PersonId, string PersonType, string Email, bool IsAdmin);

    /** Returned by GET /api/auth/validate when the token is valid. */
    internal sealed record ValidateTokenResponse(int PersonId, string PersonType, string Email, bool IsAdmin);
}
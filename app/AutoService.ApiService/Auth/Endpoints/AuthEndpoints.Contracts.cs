namespace AutoService.ApiService.Auth.Endpoints;

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

    /** Returned after a successful registration with domain record ID. */
    internal sealed record RegisterResponse(int PersonId, string PersonType, string Email);

    /** POST /api/auth/login request body. Supply either Email or PhoneNumber and Password. */
    internal sealed record LoginRequest(string? Email, string? PhoneNumber, string Password);

    /** Returned after a successful login when auth cookies were set. */
    internal sealed record LoginResponse(int PersonId, bool IsAdmin);

    /** Returned by GET /api/auth/validate when the token is valid. */
    internal sealed record ValidateTokenResponse(int PersonId, bool IsAdmin);
}
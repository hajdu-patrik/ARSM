namespace AutoService.ApiService.Auth.Endpoints;

public static partial class AuthEndpoints
{
    // ─── DTO contracts ────────────────────────────────────────────────────────

    /**
     * POST /api/auth/register request body. Mechanic-only; Customer is not supported.
     * Field constraints, all enforced by FieldLengthValidator in ValidateRegisterRequest before any
     * hashing work runs:
     * - PersonType must be "Mechanic".
     * - FirstName/LastName max 50 chars; MiddleName optional, max 50 chars.
     * - Email max 150 chars.
     * - Password must satisfy the Identity password policy (>=8 chars, digit, upper, lower, special)
     *   and is capped at 128 chars by product decision, not a DB column.
     * - PhoneNumber optional, max 20 chars.
     * - Specialization required for Mechanic; must match SpecializationType enum.
     * - Expertise required for Mechanic; 1..10 unique ExpertiseType values.
     */
    internal sealed record RegisterRequest(
        string PersonType,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string Password,
        string? PhoneNumber,
        string? Specialization,
        IReadOnlyList<string>? Expertise);

    /** Returned after a successful registration with domain record ID. */
    internal sealed record RegisterResponse(int PersonId, string PersonType, string Email);

    /**
     * POST /api/auth/login request body. Supply either Email or PhoneNumber and Password.
     * Email is capped at 150 chars, PhoneNumber at 20 chars (People DB column caps); Password is
     * capped at 128 chars by product decision. Enforced by FieldLengthValidator in
     * ValidateLoginRequest before any password-hashing work runs.
     */
    internal sealed record LoginRequest(string? Email, string? PhoneNumber, string Password);

    /** Returned after a successful login when auth cookies were set. */
    internal sealed record LoginResponse(int PersonId, bool IsAdmin);

    /** Returned by GET /api/auth/validate when the token is valid. */
    internal sealed record ValidateTokenResponse(int PersonId, bool IsAdmin);
}
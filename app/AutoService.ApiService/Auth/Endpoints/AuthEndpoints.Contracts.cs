namespace AutoService.ApiService.Auth.Endpoints;

public static partial class AuthEndpoints
{
    // ─── DTO contracts ────────────────────────────────────────────────────────

    /** POST /api/auth/register request body (Mechanic only); field limits enforced by
        FieldLengthValidator in ValidateRegisterRequest, not by attributes here. */
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

    /** POST /api/auth/login request body: supply Email or PhoneNumber, plus Password; length limits
        (People column caps) are enforced by FieldLengthValidator in ValidateLoginRequest. */
    internal sealed record LoginRequest(string? Email, string? PhoneNumber, string Password);

    /** Returned after a successful login when auth cookies were set. */
    internal sealed record LoginResponse(int PersonId, bool IsAdmin);

    /** Returned by GET /api/auth/validate when the token is valid. */
    internal sealed record ValidateTokenResponse(int PersonId, bool IsAdmin);
}
namespace AutoService.ApiService.Auth.Endpoints;

public static partial class AuthEndpoints
{

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

    internal sealed record RegisterResponse(int PersonId, string PersonType, string Email);

    /** POST /api/auth/login request body: supply Email or PhoneNumber, plus Password; length limits
        (People column caps) are enforced by FieldLengthValidator in ValidateLoginRequest. */
    internal sealed record LoginRequest(string? Email, string? PhoneNumber, string Password);

    /** The session facts the WebUI keeps: returned by login (cookies set) and by GET /api/auth/validate. */
    internal sealed record SessionResponse(int PersonId, bool IsAdmin, bool MustChangePassword);
}

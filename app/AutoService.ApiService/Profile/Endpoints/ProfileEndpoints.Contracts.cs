namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    /** Returned by GET /api/profile with the current mechanic's profile data. */
    internal sealed record ProfileResponse(
        int PersonId,
        string PersonType,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber,
        bool HasProfilePicture);

    /**
     * PUT /api/profile request body. All fields optional; only provided (non-null) fields are updated.
     * Max lengths mirror the People DB column caps: Email 150 chars, PhoneNumber 20 chars,
     * FirstName/MiddleName/LastName 50 chars each. Enforced by FieldLengthValidator in
     * UpdateProfileAsync.
     */
    internal sealed record UpdateProfileRequest(
        string? Email,
        string? PhoneNumber,
        string? MiddleName,
        string? FirstName,
        string? LastName);

    /**
     * POST /api/profile/change-password request body. All three password fields are capped at
     * 128 chars by product decision, not a DB column limit. Enforced by FieldLengthValidator in
     * ChangePasswordAsync before any password-hashing work runs.
     */
    internal sealed record ChangePasswordRequest(
        string CurrentPassword,
        string NewPassword,
        string ConfirmNewPassword);

    /** POST /api/profile/delete request body; requires the current password to confirm deletion. */
    internal sealed record DeleteProfileRequest(
        string CurrentPassword);
}

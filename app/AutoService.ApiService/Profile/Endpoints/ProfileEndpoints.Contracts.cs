namespace AutoService.ApiService.Profile.Endpoints;

public static partial class ProfileEndpoints
{
    /** GET /api/profile response body. */
    internal sealed record ProfileResponse(
        int PersonId,
        string PersonType,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber,
        bool HasProfilePicture);

    /** PUT /api/profile request body: all fields optional (only non-null ones are updated); length
        limits mirror the People columns and are enforced by FieldLengthValidator in UpdateProfileAsync. */
    internal sealed record UpdateProfileRequest(
        string? Email,
        string? PhoneNumber,
        string? MiddleName,
        string? FirstName,
        string? LastName);

    /** POST /api/profile/change-password request body; the password fields are capped at 128 chars
        by product decision (FieldLengthValidator), not by a DB column. */
    internal sealed record ChangePasswordRequest(
        string CurrentPassword,
        string NewPassword,
        string ConfirmNewPassword);

    /** DELETE /api/profile request body; requires the current password to confirm deletion. */
    internal sealed record DeleteProfileRequest(
        string CurrentPassword);
}

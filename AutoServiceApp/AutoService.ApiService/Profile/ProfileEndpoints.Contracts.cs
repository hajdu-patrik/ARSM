namespace AutoService.ApiService.Profile;

public static partial class ProfileEndpoints
{
    internal sealed record ProfileResponse(
        int PersonId,
        string PersonType,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber,
        bool HasProfilePicture);

    internal sealed record UpdateProfileRequest(
        string? Email,
        string? PhoneNumber,
        string? MiddleName);

    internal sealed record ChangePasswordRequest(
        string CurrentPassword,
        string NewPassword,
        string ConfirmNewPassword);

    internal sealed record DeleteProfileRequest(
        string CurrentPassword);
}

/**
 * ProfileEndpoints.Contracts.cs
 *
 * Auto-generated documentation header for this source file.
 */

namespace AutoService.ApiService.Profile.Endpoints;

/**
 * Backend type for API logic in this file.
 */
public static partial class ProfileEndpoints
{
    /**
 * Immutable DTO used by API request and response flows.
 */
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
 * Immutable DTO used by API request and response flows.
 */
    internal sealed record UpdateProfileRequest(
        string? Email,
        string? PhoneNumber,
        string? MiddleName,
        string? FirstName,
        string? LastName);

    /**
 * Immutable DTO used by API request and response flows.
 */
    internal sealed record ChangePasswordRequest(
        string CurrentPassword,
        string NewPassword,
        string ConfirmNewPassword);

    /**
 * Immutable DTO used by API request and response flows.
 */
    internal sealed record DeleteProfileRequest(
        string CurrentPassword);
}

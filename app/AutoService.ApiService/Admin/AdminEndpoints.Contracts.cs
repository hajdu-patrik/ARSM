/**
 * AdminEndpoints.Contracts.cs
 *
 * Auto-generated documentation header for this source file.
 */

namespace AutoService.ApiService.Admin;

/**
 * Backend type for API logic in this file.
 */
public static partial class AdminEndpoints
{
    /**
 * Immutable DTO used by API request and response flows.
 */
    internal sealed record MechanicListItem(
        int PersonId,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber,
        string Specialization,
        bool IsAdmin,
        bool HasProfilePicture);
}

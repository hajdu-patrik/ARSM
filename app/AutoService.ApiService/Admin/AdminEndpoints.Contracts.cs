namespace AutoService.ApiService.Admin;

public static partial class AdminEndpoints
{
    internal sealed record MechanicListItemDto(
        int PersonId,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber,
        string Specialization,
        bool IsAdmin,
        bool HasProfilePicture);

    /** POST /api/admin/mechanics/{id}/password-reset body: the temporary password the mechanic must replace at the next login. */
    internal sealed record ResetMechanicPasswordRequest(string TemporaryPassword);
}

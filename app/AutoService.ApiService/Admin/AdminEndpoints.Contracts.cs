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

    /** Password reset result: whether the temporary-password e-mail went out, and the address it was sent to. */
    internal sealed record ResetMechanicPasswordResponse(bool EmailSent, string Email);
}

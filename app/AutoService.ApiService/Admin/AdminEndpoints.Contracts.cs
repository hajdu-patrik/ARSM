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
}

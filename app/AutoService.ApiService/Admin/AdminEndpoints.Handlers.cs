using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Pagination;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel;

namespace AutoService.ApiService.Admin;

public static partial class AdminEndpoints
{
    /** Lists mechanics for the admin console with each row's Admin-role flag and profile-picture flag. */
    private static async Task<IResult> ListMechanicsAsync(
        [Description("1-based page number; values below 1 become 1. Default 1.")] int? page,
        [Description("Page size, clamped to 1..500. Default 20.")] int? pageSize,
        [Description("Optional case-insensitive substring filter, trimmed, max 100 characters.")] string? search,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var request = ListQueryLimits.NormalizePage(page, pageSize);

        var logger = loggerFactory.CreateLogger("AdminEndpoints.ListMechanics");

        var adminIdentityUserIdSet = (await (
            from userRole in db.UserRoles.AsNoTracking()
            join role in db.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where role.Name == "Admin"
            select userRole.UserId)
            .ToListAsync(cancellationToken))
            .ToHashSet(StringComparer.Ordinal);

        var query = db.Mechanics.AsNoTracking();
        var term = SearchTerm.Normalize(search);
        if (term is not null)
        {
            query = query.Where(PersonNameSearch.Or(
                PersonNameSearch.Matches<Mechanic>(term),
                m => m.Email.ToUpper().Contains(term) ||
                    (m.PhoneNumber != null && m.PhoneNumber.ToUpper().Contains(term)) ||
                    m.Specialization.ToString().ToUpper().Contains(term)));
        }

        var ordered = query.OrderBy(m => m.Name.LastName)
            .ThenBy(m => m.Name.FirstName)
            .ThenBy(m => m.Id);

        var result = await ordered
            .Select(m => new MechanicListItemDto(
                m.Id,
                m.Name.FirstName,
                m.Name.MiddleName,
                m.Name.LastName,
                m.Email,
                m.PhoneNumber,
                m.Specialization.ToString(),
                m.IdentityUserId != null && adminIdentityUserIdSet.Contains(m.IdentityUserId),
                ProjectionFormat.HasProfilePicture(m.ProfilePictureObjectKey)))
            .ToPagedResultAsync(request, cancellationToken);

        logger.LogInformation("Listed mechanics for admin request. Count: {Count}.", result.Items.Count);

        return Results.Ok(result);
    }
}

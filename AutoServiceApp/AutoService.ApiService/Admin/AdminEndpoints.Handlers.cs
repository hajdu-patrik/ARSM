using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace AutoService.ApiService.Admin;

public static partial class AdminEndpoints
{
    private static async Task<IResult> ListMechanicsAsync(
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var mechanics = await db.Mechanics
            .OrderBy(m => m.Name.LastName)
            .ThenBy(m => m.Name.FirstName)
            .ToListAsync(cancellationToken);

        var items = new List<MechanicListItem>(mechanics.Count);

        foreach (var mechanic in mechanics)
        {
            var isAdmin = false;

            if (mechanic.IdentityUserId is not null)
            {
                var identityUser = await userManager.FindByIdAsync(mechanic.IdentityUserId);
                if (identityUser is not null)
                {
                    isAdmin = await userManager.IsInRoleAsync(identityUser, "Admin");
                }
            }

            items.Add(new MechanicListItem(
                mechanic.Id,
                mechanic.Name.FirstName,
                mechanic.Name.MiddleName,
                mechanic.Name.LastName,
                mechanic.Email,
                mechanic.PhoneNumber,
                mechanic.Specialization.ToString(),
                isAdmin));
        }

        return Results.Ok(items);
    }

    private static async Task<IResult> DeleteMechanicAsync(
        int id,
        HttpContext httpContext,
        UserManager<IdentityUser> userManager,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var callerPersonId = httpContext.User.FindFirst("person_id")?.Value;
        if (int.TryParse(callerPersonId, out var callerPid) && callerPid == id)
        {
            return Results.Problem(
                detail: "Administrators cannot delete their own account.",
                statusCode: StatusCodes.Status403Forbidden);
        }

        var mechanic = await db.Mechanics.FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (mechanic is null)
        {
            return Results.Problem(
                detail: "Mechanic not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        if (mechanic.IdentityUserId is not null)
        {
            var identityUser = await userManager.FindByIdAsync(mechanic.IdentityUserId);
            if (identityUser is not null)
            {
                var isTargetAdmin = await userManager.IsInRoleAsync(identityUser, "Admin");
                if (isTargetAdmin)
                {
                    return Results.Problem(
                        detail: "Cannot delete an administrator account.",
                        statusCode: StatusCodes.Status403Forbidden);
                }
            }

            var invariantViolation = await ValidateMechanicDeletionInvariantsAsync(mechanic.Id, db, cancellationToken);
            if (invariantViolation is not null)
            {
                return invariantViolation;
            }

            // Revoke all refresh tokens for this mechanic.
            var refreshTokens = await db.RefreshTokens
                .Where(rt => rt.MechanicId == mechanic.Id && rt.RevokedAtUtc == null)
                .ToListAsync(cancellationToken);

            var nowUtc = DateTime.UtcNow;
            foreach (var token in refreshTokens)
            {
                token.Revoke(nowUtc);
            }

            await db.SaveChangesAsync(cancellationToken);

            // Remove domain record first, then identity.
            db.Mechanics.Remove(mechanic);
            await db.SaveChangesAsync(cancellationToken);

            if (identityUser is not null)
            {
                await userManager.DeleteAsync(identityUser);
            }
        }
        else
        {
            var invariantViolation = await ValidateMechanicDeletionInvariantsAsync(mechanic.Id, db, cancellationToken);
            if (invariantViolation is not null)
            {
                return invariantViolation;
            }

            db.Mechanics.Remove(mechanic);
            await db.SaveChangesAsync(cancellationToken);
        }

        return Results.Ok(new { message = "Mechanic deleted successfully." });
    }

    private static async Task<IResult?> ValidateMechanicDeletionInvariantsAsync(
        int mechanicId,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var mechanicCount = await db.Mechanics.CountAsync(cancellationToken);
        if (mechanicCount <= 1)
        {
            return Results.Problem(
                detail: "Cannot delete the last remaining mechanic.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var wouldLeaveUnassignedAppointment = await db.Appointments
            .Where(a => a.Mechanics.Any(m => m.Id == mechanicId))
            .AnyAsync(a => a.Mechanics.Count == 1, cancellationToken);

        if (wouldLeaveUnassignedAppointment)
        {
            return Results.Problem(
                detail: "Cannot delete this mechanic because one or more appointments would be left without assigned mechanics.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        return null;
    }
}

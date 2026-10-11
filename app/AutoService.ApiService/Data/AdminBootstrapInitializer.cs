using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Normalization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.DataInitialization;

/** Creates the first Admin mechanic from `Bootstrap:Admin` when no Admin exists yet; never touches
 * existing accounts, never logs secrets, and never stops startup. */
public static class AdminBootstrapInitializer
{
    private const string AdminRoleName = "Admin";
    private const string FailureCode = "admin_bootstrap_failed";

    // Transaction-scoped PostgreSQL advisory lock key: ASCII "ARSMADM1", serializes bootstrap across instances.
    private const long AdvisoryLockKey = 0x4152_534D_4144_4D31;

    private enum BootstrapOutcome { Created, AdminExists, ContactInUse }

    /** Runs after migrations; a no-op unless the bootstrap section is configured. */
    public static async Task EnsureBootstrapAdminAsync(this WebApplication app, CancellationToken cancellationToken = default)
    {
        var section = app.Configuration.GetSection(AdminBootstrapSettings.SectionPath);
        if (!section.Exists())
        {
            return;
        }

        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("AdminBootstrap");

        // Deliberately broad: a bootstrap failure (DB outage, timeout, commit error) must never stop the API.
        try
        {
            await RunAsync(app.Services, section, logger, cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogError("Admin bootstrap failed and was rolled back ({FailureCode}, {FailureType}).", FailureCode, exception.GetType().Name);
        }
    }

    private static async Task RunAsync(IServiceProvider services, IConfigurationSection section, ILogger logger, CancellationToken cancellationToken)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoServiceDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        var normalizedAdminRole = roleManager.NormalizeKey(AdminRoleName) ?? AdminRoleName;

        // Cheap pre-check so a configured-but-finished bootstrap stays quiet; re-checked under the lock.
        if (await AnyAdminExistsAsync(db, normalizedAdminRole, cancellationToken))
        {
            logger.LogInformation("Admin bootstrap skipped: an admin already exists.");
            return;
        }

        var settings = section.Get<AdminBootstrapSettings>() ?? new AdminBootstrapSettings();
        var invalidFields = settings.Validate(out var request);
        if (request is null)
        {
            logger.LogError("Admin bootstrap skipped: invalid configuration in fields {InvalidFields}.", string.Join(", ", invalidFields));
            return;
        }

        if (!await IsPasswordAcceptedAsync(userManager, request))
        {
            logger.LogError("Admin bootstrap skipped: invalid configuration in fields {InvalidFields}.", nameof(AdminBootstrapSettings.Password));
            return;
        }

        var strategy = db.Database.CreateExecutionStrategy();
        var (outcome, personId, identityUserId) = await strategy.ExecuteAsync(
            ct => CreateAdminUnderLockAsync(db, userManager, roleManager, normalizedAdminRole, request, ct),
            cancellationToken);

        switch (outcome)
        {
            case BootstrapOutcome.Created:
                logger.LogInformation("Admin bootstrap created mechanic {PersonId} linked to identity user {IdentityUserId}.", personId, identityUserId);
                break;
            case BootstrapOutcome.AdminExists:
                logger.LogInformation("Admin bootstrap skipped: an admin already exists.");
                break;
            case BootstrapOutcome.ContactInUse:
                logger.LogWarning("Admin bootstrap skipped: the configured email or phone number already belongs to a non-admin account.");
                break;
        }
    }

    /** One retryable unit: lock, re-check, create role, user and Mechanic, commit; failures roll back. */
    private static async Task<(BootstrapOutcome Outcome, int PersonId, string? IdentityUserId)> CreateAdminUnderLockAsync(
        AutoServiceDbContext db,
        UserManager<IdentityUser> userManager,
        RoleManager<IdentityRole> roleManager,
        string normalizedAdminRole,
        AdminBootstrapRequest request,
        CancellationToken cancellationToken)
    {
        db.ChangeTracker.Clear();
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock({AdvisoryLockKey})", cancellationToken);

        if (await AnyAdminExistsAsync(db, normalizedAdminRole, cancellationToken))
        {
            return (BootstrapOutcome.AdminExists, 0, null);
        }

        if (await IsContactInUseAsync(db, userManager, request, cancellationToken))
        {
            return (BootstrapOutcome.ContactInUse, 0, null);
        }

        if (!await roleManager.RoleExistsAsync(AdminRoleName))
        {
            EnsureSucceeded(await roleManager.CreateAsync(new IdentityRole(AdminRoleName)), "create the Admin role");
        }

        var identityUser = new IdentityUser
        {
            UserName = request.Email,
            Email = request.Email,
            EmailConfirmed = true,
            PhoneNumber = request.PhoneNumber
        };

        EnsureSucceeded(await userManager.CreateAsync(identityUser, request.Password), "create the Identity user");
        EnsureSucceeded(await userManager.AddToRoleAsync(identityUser, AdminRoleName), "assign the Admin role");

        var mechanic = new Mechanic(request.Name, request.Email, request.PhoneNumber, request.Specialization, request.Expertise)
        {
            IdentityUserId = identityUser.Id
        };
        db.Mechanics.Add(mechanic);

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return (BootstrapOutcome.Created, mechanic.Id, identityUser.Id);
    }

    private static Task<bool> AnyAdminExistsAsync(AutoServiceDbContext db, string normalizedAdminRole, CancellationToken cancellationToken)
    {
        return (
            from userRole in db.UserRoles.AsNoTracking()
            join role in db.Roles.AsNoTracking() on userRole.RoleId equals role.Id
            where role.NormalizedName == normalizedAdminRole
            select userRole.UserId)
            .AnyAsync(cancellationToken);
    }

    /** Checks the password against the configured Identity password policy before anything is written. */
    private static async Task<bool> IsPasswordAcceptedAsync(UserManager<IdentityUser> userManager, AdminBootstrapRequest request)
    {
        var probeUser = new IdentityUser { UserName = request.Email, Email = request.Email };

        foreach (var validator in userManager.PasswordValidators)
        {
            if (!(await validator.ValidateAsync(userManager, probeUser, request.Password)).Succeeded)
            {
                return false;
            }
        }

        return true;
    }

    private static async Task<bool> IsContactInUseAsync(
        AutoServiceDbContext db,
        UserManager<IdentityUser> userManager,
        AdminBootstrapRequest request,
        CancellationToken cancellationToken)
    {
        if (await userManager.FindByEmailAsync(request.Email) is not null ||
            await db.People.AsNoTracking().AnyAsync(p => p.Email == request.Email, cancellationToken))
        {
            return true;
        }

        if (request.PhoneNumber is null)
        {
            return false;
        }

        var candidates = ContactNormalization.BuildPhoneLookupCandidates(request.PhoneNumber);
        return await db.Users.AsNoTracking().AnyAsync(u => u.PhoneNumber != null && candidates.Contains(u.PhoneNumber.Trim()), cancellationToken) ||
               await db.People.AsNoTracking().AnyAsync(p => p.PhoneNumber != null && candidates.Contains(p.PhoneNumber), cancellationToken);
    }

    /** Turns a failed Identity result into an exception; the outer handler logs only its type. */
    private static void EnsureSucceeded(IdentityResult result, string step)
    {
        if (!result.Succeeded)
        {
            throw new InvalidOperationException($"Could not {step}.");
        }
    }
}

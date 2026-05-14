using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.DataInitialization;

/**
 * Seeds deterministic demo data for local development and manual testing.
 *
 * Only mechanics receive login accounts — customers are passive data records
 * (vehicle owners, notification targets) and cannot log in to the dashboard.
 *
 * Demo password policy:
 * - DemoData:MechanicPassword is always required.
 * - Outside Development: also requires explicit DemoData:EnableSeeding=true.
 */
public static partial class DemoDataInitializer
{
    private static readonly string[] DemoMechanicEmails =
    [
        "gabor.kovacs@example.com",
        "peter.nagy@example.com",
        "mate.szabo@example.com"
    ];

    /**
     * Applies pending migrations and inserts demo data when the database is empty.
     *
     * @param app The web application used to resolve scoped services.
    * @param cancellationToken Token used to cancel migration and EF seeding I/O.
     * @return A task that completes when migration and conditional seeding are finished.
     */
    public static async Task EnsureSeededAsync(this WebApplication app, CancellationToken cancellationToken = default)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoServiceDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        await db.Database.MigrateAsync(cancellationToken);

        // Avoid creating known demo credentials outside development unless explicitly enabled.
        var enableDemoSeedOutsideDevelopment = app.Configuration.GetValue<bool>("DemoData:EnableSeeding");
        if (!app.Environment.IsDevelopment() && !enableDemoSeedOutsideDevelopment)
            return;

        var mechanicPassword = app.Configuration["DemoData:MechanicPassword"];
        if (string.IsNullOrWhiteSpace(mechanicPassword))
        {
            throw new InvalidOperationException(
                "Demo seeding requires 'DemoData:MechanicPassword'. Set it in appsettings.Local.json, user secrets, or environment variables.");
        }

        if (AutoService.ApiService.Configuration.TemplateMarkerDetector.ContainsTemplateMarker(mechanicPassword))
        {
            throw new InvalidOperationException(
                "Demo seeding password 'DemoData:MechanicPassword' still contains a template placeholder marker (for example CHANGE_ME or SET_UNIQUE_LOCAL). Replace it with a unique local password before startup.");
        }

        var hasMechanics = await db.Mechanics.AnyAsync(cancellationToken);
        var hasCustomers = await db.Customers.AnyAsync(cancellationToken);
        var hasVehicles = await db.Vehicles.AnyAsync(cancellationToken);
        var hasAppointments = await db.Appointments.AnyAsync(cancellationToken);
        var hasIdentityUsers = await db.Users.AnyAsync(cancellationToken);

        // Older migration backfill can leave a customer-only dataset with no mechanics/identity users.
        // Reset that inconsistent state so deterministic demo seeding can create full auth-capable data.
        if (!hasMechanics && !hasIdentityUsers && (hasCustomers || hasVehicles || hasAppointments))
        {
            await ResetLegacyBackfillDatasetAsync(db, cancellationToken);
            hasCustomers = false;
            hasVehicles = false;
            hasAppointments = false;
        }

        await NormalizePersistedDataAsync(db, cancellationToken);

        if (hasMechanics || hasCustomers || hasVehicles || hasAppointments || hasIdentityUsers)
        {
            await EnsureDemoMechanicPasswordsAsync(userManager, mechanicPassword);
            // Ensure Admin role assignment still converges on already-seeded datasets.
            await EnsureAdminRoleAsync(userManager, roleManager);
            return;
        }

        // Create mechanics with linked Identity accounts.
        var mechanicSeeds = DemoDataSeedFactory.CreateMechanicSeeds();

        var mechanics = new List<Mechanic>();
        foreach (var seed in mechanicSeeds)
        {
            var identityUserId = await CreateIdentityUserAsync(userManager, seed.Email, seed.Phone, mechanicPassword);
            var mechanic = new Mechanic(seed.Name, seed.Email, seed.Phone, seed.Spec, seed.Skills)
            {
                IdentityUserId = identityUserId
            };
            mechanics.Add(mechanic);
        }
        db.Mechanics.AddRange(mechanics);

        // Customers are passive data records — no login account, no IdentityUserId.
        var customers = DemoDataSeedFactory.CreateCustomers();
        db.Customers.AddRange(customers);

        await db.SaveChangesAsync(cancellationToken);

        // Create vehicles.
        var vehicles = DemoDataSeedFactory.CreateVehicles(customers);

        db.Vehicles.AddRange(vehicles);
        await db.SaveChangesAsync(cancellationToken);

        // Create appointments.
        var appointments = DemoDataSeedFactory.CreateAppointments(vehicles, mechanics, DateTime.UtcNow);

        db.Appointments.AddRange(appointments);
        await db.SaveChangesAsync(cancellationToken);

        await EnsureDemoMechanicPasswordsAsync(userManager, mechanicPassword);

        // Ensure role exists and first mechanic is assigned Admin after identity users were created.
        await EnsureAdminRoleAsync(userManager, roleManager);
    }

    /**
     * Ensures the "Admin" Identity role exists and is assigned to the first mechanic
     * (Gabor Kovacs). Runs on every startup and is idempotent — safe to call when the
     * role and assignment already exist.
     */
    private static async Task EnsureAdminRoleAsync(
        UserManager<IdentityUser> userManager,
        RoleManager<IdentityRole> roleManager)
    {
        if (!await roleManager.RoleExistsAsync("Admin"))
        {
            await roleManager.CreateAsync(new IdentityRole("Admin"));
        }

        var adminUser = await userManager.FindByEmailAsync("gabor.kovacs@example.com");
        if (adminUser is not null && !await userManager.IsInRoleAsync(adminUser, "Admin"))
        {
            await userManager.AddToRoleAsync(adminUser, "Admin");
        }
    }

    /**
     * Creates an ASP.NET Core Identity user with the given credentials.
     *
     * @param userManager The Identity UserManager used to persist the account.
     * @param email Email address used as both username and email.
     * @param phone Optional phone number stored on the Identity account.
     * @param password Plain-text password that Identity will hash before storing.
     * @return The generated Identity user ID (GUID string) to link to the domain entity.
     */
    private static async Task<string> CreateIdentityUserAsync(
        UserManager<IdentityUser> userManager,
        string email,
        string? phone,
        string password)
    {
        var identityUser = new IdentityUser
        {
            UserName = email,
            Email = email,
            PhoneNumber = phone
        };

        var result = await userManager.CreateAsync(identityUser, password);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Demo seeding failed: could not create Identity user for '{email}': {errors}");
        }

        return identityUser.Id;
    }

    private static async Task EnsureDemoMechanicPasswordsAsync(
        UserManager<IdentityUser> userManager,
        string configuredPassword)
    {
        foreach (var email in DemoMechanicEmails)
        {
            var user = await userManager.FindByEmailAsync(email);
            if (user is null)
            {
                continue;
            }

            var passwordHash = user.PasswordHash;
            if (string.IsNullOrWhiteSpace(passwordHash))
            {
                var addPasswordResult = await userManager.AddPasswordAsync(user, configuredPassword);
                if (!addPasswordResult.Succeeded)
                {
                    var addPasswordErrors = string.Join(", ", addPasswordResult.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Demo seeding failed: could not set password for '{email}': {addPasswordErrors}");
                }

                continue;
            }

            var verificationResult = userManager.PasswordHasher.VerifyHashedPassword(user, passwordHash, configuredPassword);
            if (verificationResult is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded)
            {
                continue;
            }

            var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await userManager.ResetPasswordAsync(user, resetToken, configuredPassword);
            if (!resetResult.Succeeded)
            {
                var resetErrors = string.Join(", ", resetResult.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Demo seeding failed: could not synchronize password for '{email}': {resetErrors}");
            }
        }
    }
}

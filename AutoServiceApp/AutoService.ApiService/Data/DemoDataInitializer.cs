using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using AutoService.ApiService.Models.UniqueTypes;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Text;

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
public static class DemoDataInitializer
{
    /**
     * Applies pending migrations and inserts demo data when the database is empty.
     *
     * @param app The web application used to resolve scoped services.
     * @return A task that completes when migration and conditional seeding are finished.
     */
    public static async Task EnsureSeededAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AutoServiceDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

        await db.Database.MigrateAsync();

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

        if (ContainsTemplateMarker(mechanicPassword))
        {
            throw new InvalidOperationException(
                "Demo seeding password 'DemoData:MechanicPassword' still contains a template placeholder marker (for example CHANGE_ME or SET_UNIQUE_LOCAL). Replace it with a unique local password before startup.");
        }

        var hasMechanics = await db.Mechanics.AnyAsync();
        var hasCustomers = await db.Customers.AnyAsync();
        var hasVehicles = await db.Vehicles.AnyAsync();
        var hasAppointments = await db.Appointments.AnyAsync();
        var hasIdentityUsers = await db.Users.AnyAsync();

        // Older migration backfill can leave a customer-only dataset with no mechanics/identity users.
        // Reset that inconsistent state so deterministic demo seeding can create full auth-capable data.
        if (!hasMechanics && !hasIdentityUsers && (hasCustomers || hasVehicles || hasAppointments))
        {
            await ResetLegacyBackfillDatasetAsync(db);
            hasCustomers = false;
            hasVehicles = false;
            hasAppointments = false;
        }

        if (hasMechanics || hasCustomers || hasVehicles || hasAppointments || hasIdentityUsers)
        {
            // Ensure Admin role assignment still converges on already-seeded datasets.
            await EnsureAdminRoleAsync(userManager, roleManager);
            return;
        }

        // Create mechanics with linked Identity accounts.
        var mechanicSeeds = new[]
        {
            (Name: new FullName("Gabor", null, "Kovacs"),    Email: "gabor.kovacs@example.com", Phone: "+36301112233",
             Spec: SpecializationType.GasolineAndDiesel,
             Skills: new List<ExpertiseType> { ExpertiseType.Engine, ExpertiseType.Transmission, ExpertiseType.Brakes, ExpertiseType.FuelSystem }),

            (Name: new FullName("Peter", null, "Nagy"),      Email: "peter.nagy@example.com",   Phone: "+36302223344",
             Spec: SpecializationType.HybridAndElectric,
             Skills: new List<ExpertiseType> { ExpertiseType.ElectricalSystem, ExpertiseType.CoolingSystem, ExpertiseType.Suspension, ExpertiseType.Brakes, ExpertiseType.AirConditioning }),

            (Name: new FullName("Mate", null, "Szabo"),      Email: "mate.szabo@example.com",   Phone: "+36303334455",
             Spec: SpecializationType.All,
             Skills: new List<ExpertiseType> { ExpertiseType.Engine, ExpertiseType.Transmission, ExpertiseType.Brakes, ExpertiseType.Suspension, ExpertiseType.ExhaustSystem, ExpertiseType.Bodywork })
        };

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
        var customers = new List<Customer>
        {
            new(new FullName("Anna",   "Maria", "Toth"),   "anna.toth@example.com",     "+36304445566"),
            new(new FullName("Bence",  null,    "Farkas"),  "bence.farkas@example.com",  "+36305556677"),
            new(new FullName("Csilla", "Kata",  "Varga"),   "csilla.varga@example.com",  null),
            new(new FullName("David",  null,    "Kiss"),    "david.kiss@example.com",    "+36306667788"),
            new(new FullName("Emese",  null,    "Lakatos"), "emese.lakatos@example.com", null)
        };
        db.Customers.AddRange(customers);
        
        await db.SaveChangesAsync();


        // Create vehicles.
        var vehicles = new List<Vehicle>
        {
            new()
            {
                LicensePlate = "ABC-101",
                Brand = "Volkswagen",
                Model = "Golf",
                Year = 2018,
                MileageKm = 124_500,
                EnginePowerHp = 110,
                EngineTorqueNm = 250,
                CustomerId = customers[0].Id
            },
            new()
            {
                LicensePlate = "BCD-202",
                Brand = "Toyota",
                Model = "Corolla Hybrid",
                Year = 2021,
                MileageKm = 63_200,
                EnginePowerHp = 122,
                EngineTorqueNm = 190,
                CustomerId = customers[1].Id
            },
            new()
            {
                LicensePlate = "CDE-303",
                Brand = "Tesla",
                Model = "Model 3",
                Year = 2022,
                MileageKm = 48_000,
                EnginePowerHp = 283,
                EngineTorqueNm = 420,
                CustomerId = customers[2].Id
            },
            new()
            {
                LicensePlate = "DEF-404",
                Brand = "Ford",
                Model = "Focus",
                Year = 2016,
                MileageKm = 167_800,
                EnginePowerHp = 125,
                EngineTorqueNm = 200,
                CustomerId = customers[3].Id
            },
            new()
            {
                LicensePlate = "EFG-505",
                Brand = "BMW",
                Model = "320d",
                Year = 2019,
                MileageKm = 91_300,
                EnginePowerHp = 190,
                EngineTorqueNm = 400,
                CustomerId = customers[4].Id
            }
        };

        db.Vehicles.AddRange(vehicles);
        await db.SaveChangesAsync();


        // Create appointments.
        var appointments = new List<Appointment>
        {
            new()
            {
                ScheduledDate = DateTime.UtcNow.AddDays(2),
                IntakeCreatedAt = DateTime.UtcNow,
                DueDateTime = DateTime.UtcNow.AddDays(5),
                TaskDescription = "Idoszakos olajcsere es altalanos atvizsgalas",
                Status = ProgresStatus.InProgress,
                VehicleId = vehicles[0].Id,
                Mechanics = new List<Mechanic> { mechanics[0] }
            },
            new()
            {
                ScheduledDate = DateTime.UtcNow.AddDays(4),
                IntakeCreatedAt = DateTime.UtcNow,
                DueDateTime = DateTime.UtcNow.AddDays(7),
                TaskDescription = "Fekrendszer ellenorzes es betetcsere",
                Status = ProgresStatus.InProgress,
                VehicleId = vehicles[1].Id,
                Mechanics = new List<Mechanic> { mechanics[1] }
            },
            new()
            {
                ScheduledDate = DateTime.UtcNow.AddDays(-1),
                IntakeCreatedAt = DateTime.UtcNow,
                DueDateTime = DateTime.UtcNow.AddDays(2),
                TaskDescription = "Motor diagnozis es kipufogo javitas",
                Status = ProgresStatus.InProgress,
                VehicleId = vehicles[2].Id,
                Mechanics = new List<Mechanic> { mechanics[2] }
            },
            new()
            {
                ScheduledDate = DateTime.UtcNow.AddDays(-7),
                IntakeCreatedAt = DateTime.UtcNow,
                DueDateTime = DateTime.UtcNow.AddDays(-4),
                TaskDescription = "Futomu beallitas es kormanygeometria",
                Status = ProgresStatus.Completed,
                VehicleId = vehicles[3].Id,
                Mechanics = new List<Mechanic> { mechanics[0], mechanics[2] }
            },
            new()
            {
                ScheduledDate = DateTime.UtcNow.AddDays(-3),
                IntakeCreatedAt = DateTime.UtcNow,
                DueDateTime = DateTime.UtcNow,
                TaskDescription = "Akkumulator csere es elektromos hiba keresese",
                Status = ProgresStatus.Cancelled,
                VehicleId = vehicles[4].Id,
                Mechanics = new List<Mechanic> { mechanics[1] }
            }
        };

        var nowUtc = DateTime.UtcNow;
        var monthStartUtc = new DateTime(nowUtc.Year, nowUtc.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var daysInCurrentMonth = DateTime.DaysInMonth(nowUtc.Year, nowUtc.Month);
        var generatedTaskTemplates = new[]
        {
            "Olajcsere es szurok ellenorzese",
            "Fekrendszer diagnosztika",
            "Futomu es gumi allapotfelmeres",
            "Akkumulator es toltesi rendszer ellenorzes",
            "Motor hibakod olvasas es teszt",
            "Legkondicionalo rendszer karbantartas",
            "Kipufogo rendszer atvizsgalas",
            "Uzemanyag rendszer tisztitas"
        };

        for (var i = 0; i < 30; i++)
        {
            var dayOfMonth = i < 6
                ? nowUtc.Day
                : ((i * 2) % daysInCurrentMonth) + 1;

            var scheduledDateUtc = new DateTime(
                nowUtc.Year,
                nowUtc.Month,
                dayOfMonth,
                8 + (i % 9),
                i % 2 == 0 ? 0 : 30,
                0,
                DateTimeKind.Utc);

            var assignedMechanics = new List<Mechanic>
            {
                mechanics[i % mechanics.Count]
            };

            if (i % 4 == 0)
            {
                var secondMechanic = mechanics[(i + 1) % mechanics.Count];
                if (assignedMechanics.All(m => m.Id != secondMechanic.Id))
                {
                    assignedMechanics.Add(secondMechanic);
                }
            }

            var status = ProgresStatus.InProgress;
            DateTime? completedAt = null;
            DateTime? canceledAt = null;

            if (scheduledDateUtc < nowUtc.Date && i % 7 == 0)
            {
                status = ProgresStatus.Cancelled;
                canceledAt = scheduledDateUtc.AddHours(1);
            }
            else if (scheduledDateUtc < nowUtc.Date && i % 5 == 0)
            {
                status = ProgresStatus.Completed;
                completedAt = scheduledDateUtc.AddHours(2);
            }

            appointments.Add(new Appointment
            {
                ScheduledDate = scheduledDateUtc,
                IntakeCreatedAt = scheduledDateUtc.AddHours(-2),
                DueDateTime = scheduledDateUtc.AddDays(3),
                TaskDescription = $"{generatedTaskTemplates[i % generatedTaskTemplates.Length]} #{i + 1}",
                Status = status,
                CompletedAt = completedAt,
                CanceledAt = canceledAt,
                VehicleId = vehicles[i % vehicles.Count].Id,
                Mechanics = assignedMechanics
            });
        }

        db.Appointments.AddRange(appointments);
        await db.SaveChangesAsync();

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

    private static bool ContainsTemplateMarker(string value)
    {
        if (value.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase)
            || value.Contains("SET_UNIQUE_LOCAL", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var normalized = NormalizeForMarkerDetection(value);
        return normalized.Contains("CHANGEME", StringComparison.Ordinal)
            || normalized.Contains("SETUNIQUELOCAL", StringComparison.Ordinal);
    }

    private static string NormalizeForMarkerDetection(string value)
    {
        var builder = new StringBuilder(value.Length);
        foreach (var c in value)
        {
            if (char.IsLetterOrDigit(c))
            {
                builder.Append(char.ToUpperInvariant(c));
            }
        }

        return builder.ToString();
    }

    private static async Task ResetLegacyBackfillDatasetAsync(AutoServiceDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync(
            """
            TRUNCATE TABLE
                appointmentmechanics,
                appointments,
                vehicles,
                refreshtokens,
                revokedjwttokens,
                people,
                "AspNetUserTokens",
                "AspNetUserRoles",
                "AspNetUserLogins",
                "AspNetUserClaims",
                "AspNetRoleClaims",
                "AspNetUsers",
                "AspNetRoles"
            RESTART IDENTITY CASCADE;
            """);
    }
}

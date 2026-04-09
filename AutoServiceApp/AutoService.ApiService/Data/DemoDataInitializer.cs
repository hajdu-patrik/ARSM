using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using AutoService.ApiService.Models.UniqueTypes;
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

        // Ensure the Admin role and assignment exist on every startup (idempotent).
        await EnsureAdminRoleAsync(userManager, roleManager);

        if (await db.Mechanics.AnyAsync() || await db.Customers.AnyAsync() || await db.Vehicles.AnyAsync() || await db.Appointments.AnyAsync())
            return;

        // Create mechanics with linked Identity accounts.
        var mechanicSeeds = new[]
        {
            (Name: new FullName("Gabor", null, "Kovacs"),    Email: "gabor.kovacs@gmail.com", Phone: "+36301112233",
             Spec: SpecializationType.GasolineAndDiesel,
             Skills: new List<ExpertiseType> { ExpertiseType.Engine, ExpertiseType.Transmission, ExpertiseType.Brakes, ExpertiseType.FuelSystem }),

            (Name: new FullName("Peter", null, "Nagy"),      Email: "peter.nagy@gmail.com",   Phone: "+36302223344",
             Spec: SpecializationType.HybridAndElectric,
             Skills: new List<ExpertiseType> { ExpertiseType.ElectricalSystem, ExpertiseType.CoolingSystem, ExpertiseType.Suspension, ExpertiseType.Brakes, ExpertiseType.AirConditioning }),

            (Name: new FullName("Mate", null, "Szabo"),      Email: "mate.szabo@gmail.com",   Phone: "+36303334455",
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
            new(new FullName("Anna",   "Maria", "Toth"),   "anna.toth@gmail.com",     "+36304445566"),
            new(new FullName("Bence",  null,    "Farkas"),  "bence.farkas@gmail.com",  "+36305556677"),
            new(new FullName("Csilla", "Kata",  "Varga"),   "csilla.varga@gmail.com",  null),
            new(new FullName("David",  null,    "Kiss"),    "david.kiss@gmail.com",    "+36306667788"),
            new(new FullName("Emese",  null,    "Lakatos"), "emese.lakatos@gmail.com", null)
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
                TaskDescription = "Idoszakos olajcsere es altalanos atvizsgalas",
                Status = ProgresStatus.InProgress,
                VehicleId = vehicles[0].Id,
                Mechanics = new List<Mechanic> { mechanics[0] }
            },
            new()
            {
                ScheduledDate = DateTime.UtcNow.AddDays(4),
                TaskDescription = "Fekrendszer ellenorzes es betetcsere",
                Status = ProgresStatus.InProgress,
                VehicleId = vehicles[1].Id,
                Mechanics = new List<Mechanic> { mechanics[1] }
            },
            new()
            {
                ScheduledDate = DateTime.UtcNow.AddDays(-1),
                TaskDescription = "Motor diagnozis es kipufogo javitas",
                Status = ProgresStatus.InProgress,
                VehicleId = vehicles[2].Id,
                Mechanics = new List<Mechanic> { mechanics[2] }
            },
            new()
            {
                ScheduledDate = DateTime.UtcNow.AddDays(-7),
                TaskDescription = "Futomu beallitas es kormanygeometria",
                Status = ProgresStatus.Completed,
                VehicleId = vehicles[3].Id,
                Mechanics = new List<Mechanic> { mechanics[0], mechanics[2] }
            },
            new()
            {
                ScheduledDate = DateTime.UtcNow.AddDays(-3),
                TaskDescription = "Akkumulator csere es elektromos hiba keresese",
                Status = ProgresStatus.Cancelled,
                VehicleId = vehicles[4].Id,
                Mechanics = new List<Mechanic> { mechanics[1] }
            }
        };

        db.Appointments.AddRange(appointments);
        await db.SaveChangesAsync();
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

        var adminUser = await userManager.FindByEmailAsync("gabor.kovacs@gmail.com");
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
}

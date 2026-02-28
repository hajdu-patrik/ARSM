using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using AutoService.ApiService.Models.UniqueTypes;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.DataInitialization;

/**
 * Seeds deterministic demo data for local development and manual testing.
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

        await db.Database.MigrateAsync();

        if (await db.Mechanics.AnyAsync() || await db.Customers.AnyAsync() || await db.Vehicles.AnyAsync() || await db.Appointments.AnyAsync())
            return;

        // Create mechanics.
        var mechanics = new List<Mechanic>
        {
            new(
                new FullName("Gabor", null, "Kovacs"),
                "gabor.kovacs@gmail.com",
                "+36301112233",
                SpecializationType.GasolineAndDiesel,
                new List<ExpertiseType>
                {
                    ExpertiseType.Engine,
                    ExpertiseType.Transmission,
                    ExpertiseType.Brakes,
                    ExpertiseType.FuelSystem
                }),
            new(
                new FullName("Peter", null, "Nagy"),
                "peter.nagy@gmail.com",
                "+36302223344",
                SpecializationType.HybridAndElectric,
                new List<ExpertiseType>
                {
                    ExpertiseType.ElectricalSystem,
                    ExpertiseType.CoolingSystem,
                    ExpertiseType.Suspension,
                    ExpertiseType.Brakes,
                    ExpertiseType.AirConditioning
                }),
            new(
                new FullName("Mate", null, "Szabo"),
                "mate.szabo@gmail.com",
                "+36303334455",
                SpecializationType.All,
                new List<ExpertiseType>
                {
                    ExpertiseType.Engine,
                    ExpertiseType.Transmission,
                    ExpertiseType.Brakes,
                    ExpertiseType.Suspension,
                    ExpertiseType.ExhaustSystem,
                    ExpertiseType.Bodywork
                })
        };

        // Create customers.
        var customers = new List<Customer>
        {
            new(new FullName("Anna", "Maria", "Toth"), "anna.toth@gmail.com", "+36304445566"),
            new(new FullName("Bence", null, "Farkas"), "bence.farkas@gmail.com", "+36305556677"),
            new(new FullName("Csilla", "Kata", "Varga"), "csilla.varga@gmail.com", null),
            new(new FullName("David", null, "Kiss"), "david.kiss@gmail.com", "+36306667788"),
            new(new FullName("Emese", null, "Lakatos"), "emese.lakatos@gmail.com", null)
        };

        db.Mechanics.AddRange(mechanics);
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
                Status = ProgresStatus.Scheduled,
                VehicleId = vehicles[0].Id,
                Mechanics = new List<Mechanic> { mechanics[0] }
            },
            new()
            {
                ScheduledDate = DateTime.UtcNow.AddDays(4),
                TaskDescription = "Fekrendszer ellenorzes es betetcsere",
                Status = ProgresStatus.Scheduled,
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
}

using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.ApiService.DataInitialization;

internal readonly record struct DemoMechanicSeed(
    FullName Name,
    string Email,
    string Phone,
    SpecializationType Spec,
    List<ExpertiseType> Skills);

internal static class DemoDataSeedFactory
{
    internal static IReadOnlyList<DemoMechanicSeed> CreateMechanicSeeds() =>
    [
        new(
            new FullName("Gabor", null, "Kovacs"),
            "gabor.kovacs@example.com",
            "+36301112233",
            SpecializationType.GasolineAndDiesel,
            [ExpertiseType.Engine, ExpertiseType.Transmission, ExpertiseType.Brakes, ExpertiseType.FuelSystem]),
        new(
            new FullName("Peter", null, "Nagy"),
            "peter.nagy@example.com",
            "+36302223344",
            SpecializationType.HybridAndElectric,
            [ExpertiseType.ElectricalSystem, ExpertiseType.CoolingSystem, ExpertiseType.Suspension, ExpertiseType.Brakes, ExpertiseType.AirConditioning]),
        new(
            new FullName("Mate", null, "Szabo"),
            "mate.szabo@example.com",
            "+36303334455",
            SpecializationType.All,
            [ExpertiseType.Engine, ExpertiseType.Transmission, ExpertiseType.Brakes, ExpertiseType.Suspension, ExpertiseType.ExhaustSystem, ExpertiseType.Bodywork])
    ];

    internal static List<Customer> CreateCustomers() =>
    [
        new(new FullName("Anna", "Maria", "Toth"), "anna.toth@example.com", "+36304445566"),
        new(new FullName("Bence", null, "Farkas"), "bence.farkas@example.com", "+36305556677"),
        new(new FullName("Csilla", "Kata", "Varga"), "csilla.varga@example.com", null),
        new(new FullName("David", null, "Kiss"), "david.kiss@example.com", "+36306667788"),
        new(new FullName("Emese", null, "Lakatos"), "emese.lakatos@example.com", null)
    ];

    internal static List<Vehicle> CreateVehicles(IReadOnlyList<Customer> customers) =>
    [
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
    ];

    internal static List<Appointment> CreateAppointments(
        IReadOnlyList<Vehicle> vehicles,
        IReadOnlyList<Mechanic> mechanics,
        DateTime nowUtc)
    {
        var appointments = CreateBaseAppointments(vehicles, mechanics, nowUtc);
        AddGeneratedMonthlyAppointments(appointments, vehicles, mechanics, nowUtc);
        return appointments;
    }

    private static List<Appointment> CreateBaseAppointments(
        IReadOnlyList<Vehicle> vehicles,
        IReadOnlyList<Mechanic> mechanics,
        DateTime nowUtc) =>
    [
        new()
        {
            ScheduledDate = nowUtc.AddDays(2),
            IntakeCreatedAt = nowUtc,
            DueDateTime = nowUtc.AddDays(5),
            TaskDescription = "Periodic oil change and general inspection",
            Status = ProgressStatus.InProgress,
            VehicleId = vehicles[0].Id,
            Mechanics = [mechanics[0]]
        },
        new()
        {
            ScheduledDate = nowUtc.AddDays(4),
            IntakeCreatedAt = nowUtc,
            DueDateTime = nowUtc.AddDays(7),
            TaskDescription = "Brake system inspection and pad replacement",
            Status = ProgressStatus.InProgress,
            VehicleId = vehicles[1].Id,
            Mechanics = [mechanics[1]]
        },
        new()
        {
            ScheduledDate = nowUtc.AddDays(-1),
            IntakeCreatedAt = nowUtc,
            DueDateTime = nowUtc.AddDays(2),
            TaskDescription = "Engine diagnostics and exhaust repair",
            Status = ProgressStatus.InProgress,
            VehicleId = vehicles[2].Id,
            Mechanics = [mechanics[2]]
        },
        new()
        {
            ScheduledDate = nowUtc.AddDays(-7),
            IntakeCreatedAt = nowUtc,
            DueDateTime = nowUtc.AddDays(-4),
            TaskDescription = "Suspension adjustment and wheel alignment",
            Status = ProgressStatus.Completed,
            CompletedAt = nowUtc.AddDays(-4),
            VehicleId = vehicles[3].Id,
            Mechanics = [mechanics[0], mechanics[2]]
        },
        new()
        {
            ScheduledDate = nowUtc.AddDays(-3),
            IntakeCreatedAt = nowUtc,
            DueDateTime = nowUtc,
            TaskDescription = "Battery replacement and electrical fault diagnosis",
            Status = ProgressStatus.Cancelled,
            CanceledAt = nowUtc.AddDays(-3).AddHours(1),
            VehicleId = vehicles[4].Id,
            Mechanics = [mechanics[1]]
        }
    ];

    private static void AddGeneratedMonthlyAppointments(
        List<Appointment> appointments,
        IReadOnlyList<Vehicle> vehicles,
        IReadOnlyList<Mechanic> mechanics,
        DateTime nowUtc)
    {
        var daysInCurrentMonth = DateTime.DaysInMonth(nowUtc.Year, nowUtc.Month);
        var generatedTaskTemplates = new[]
        {
            "Oil change and filter inspection",
            "Brake system diagnostics",
            "Suspension and tire condition assessment",
            "Battery and charging system check",
            "Engine fault code reading and test",
            "Air conditioning system maintenance",
            "Exhaust system inspection",
            "Fuel system cleaning"
        };

        for (var i = 0; i < 30; i++)
        {
            var scheduledDateUtc = CreateGeneratedScheduledDate(nowUtc, daysInCurrentMonth, i);
            var assignedMechanics = CreateGeneratedMechanicAssignments(mechanics, i);
            var status = ResolveGeneratedStatus(scheduledDateUtc, nowUtc, i, out var completedAt, out var canceledAt);

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
    }

    private static DateTime CreateGeneratedScheduledDate(DateTime nowUtc, int daysInCurrentMonth, int index)
    {
        var dayOfMonth = index < 6
            ? nowUtc.Day
            : ((index * 2) % daysInCurrentMonth) + 1;

        return new DateTime(
            nowUtc.Year,
            nowUtc.Month,
            dayOfMonth,
            8 + (index % 9),
            index % 2 == 0 ? 0 : 30,
            0,
            DateTimeKind.Utc);
    }

    private static List<Mechanic> CreateGeneratedMechanicAssignments(IReadOnlyList<Mechanic> mechanics, int index)
    {
        var assignedMechanics = new List<Mechanic>
        {
            mechanics[index % mechanics.Count]
        };

        if (index % 4 != 0)
        {
            return assignedMechanics;
        }

        var secondMechanic = mechanics[(index + 1) % mechanics.Count];
        if (assignedMechanics.All(mechanic => mechanic.Id != secondMechanic.Id))
        {
            assignedMechanics.Add(secondMechanic);
        }

        return assignedMechanics;
    }

    private static ProgressStatus ResolveGeneratedStatus(
        DateTime scheduledDateUtc,
        DateTime nowUtc,
        int index,
        out DateTime? completedAt,
        out DateTime? canceledAt)
    {
        completedAt = null;
        canceledAt = null;

        if (scheduledDateUtc < nowUtc.Date && index % 7 == 0)
        {
            canceledAt = scheduledDateUtc.AddHours(1);
            return ProgressStatus.Cancelled;
        }

        if (scheduledDateUtc < nowUtc.Date && index % 5 == 0)
        {
            completedAt = scheduledDateUtc.AddHours(2);
            return ProgressStatus.Completed;
        }

        return ProgressStatus.InProgress;
    }
}
using AutoService.ApiService.Appointments.Realtime;
using System.Security.Claims;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Linking;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;
using AutoService.ApiService.Identity;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /** Creates an appointment from the scheduler intake, creating the customer and vehicle when they are new. */
    private static async Task<IResult> CreateIntakeAsync(
        SchedulerCreateIntakeRequest request,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.Intake");

        var validationError = ValidateIntakeRequest(
            request, logger, out var normalizedEmail, out var taskDescription, out var scheduledDateUtc, out var dueDateTimeUtc);
        if (validationError is not null)
        {
            return validationError;
        }

        var usesExistingVehicle = request.VehicleId.HasValue;

        if (!user.TryGetPersonId(out var mechanicId))
        {
            logger.LogWarning("Intake rejected: missing or invalid person_id claim.");
            return Results.Unauthorized();
        }

        var mechanic = await db.Mechanics
            .FirstOrDefaultAsync(m => m.Id == mechanicId, cancellationToken);

        if (mechanic is null)
        {
            logger.LogWarning("Intake rejected: requesting mechanic {MechanicId} not found.", mechanicId);
            return Results.Unauthorized();
        }

        var (customer, linkedMechanicForEmail, customerEmail) = await FindIntakeCustomerAsync(normalizedEmail, db, cancellationToken);

        var creatingCustomer = customer is null;
        if (creatingCustomer)
        {
            var (customerError, newCustomer) = await CreateIntakeCustomerAsync(
                request, linkedMechanicForEmail, customerEmail, db, logger, cancellationToken);
            if (customerError is not null)
            {
                return customerError;
            }

            customer = newCustomer;
        }

        var (vehicleError, resolvedVehicle) = usesExistingVehicle
            ? await FindIntakeVehicleAsync(request.VehicleId.GetValueOrDefault(), customer, db, logger, cancellationToken)
            : await CreateIntakeVehicleAsync(request.Vehicle!, customer!, db, cancellationToken);
        if (vehicleError is not null)
        {
            return vehicleError;
        }

        var vehicle = resolvedVehicle!;

        var appointment = NewIntakeAppointment(mechanic, vehicle, taskDescription, scheduledDateUtc, dueDateTimeUtc);

        var saveError = await SaveIntakeAppointmentAsync(appointment, db, logger, cancellationToken);
        if (saveError is not null)
        {
            return saveError;
        }

        logger.LogInformation(
            "Intake created appointment {AppointmentId} by mechanic {MechanicId}. CreatedCustomer: {CreatedCustomer}, UsedExistingVehicle: {UsedExistingVehicle}.",
            appointment.Id,
            mechanicId,
            creatingCustomer,
            usesExistingVehicle);
        broadcaster.PublishAppointmentChanged(appointment.Id);

        return Results.Created($"/api/appointments/{appointment.Id}", ToDto(appointment));
    }

    /** The customer matching the email, else the one a mechanic with that email owns; also yields the email actually used. */
    private static async Task<(Customer? Customer, Mechanic? LinkedMechanic, string Email)> FindIntakeCustomerAsync(
        string normalizedEmail,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var customer = await db.Customers
            .FirstOrDefaultAsync(c => c.Email == normalizedEmail, cancellationToken);

        var linkedMechanic = customer is null
            ? await db.Mechanics.FirstOrDefaultAsync(m => m.Email == normalizedEmail, cancellationToken)
            : null;

        if (customer is null && linkedMechanic is not null)
        {
            var mechanicOwnedCustomerEmail = CustomerOwnerLinking.BuildMechanicOwnedCustomerEmail(linkedMechanic.Id);
            customer = await db.Customers
                .FirstOrDefaultAsync(c => c.Email == mechanicOwnedCustomerEmail, cancellationToken);
            return (customer, linkedMechanic, mechanicOwnedCustomerEmail);
        }

        return (customer, linkedMechanic, normalizedEmail);
    }

    /** Builds the in-progress appointment of an intake; a vehicle that already has an id is linked by key. */
    private static Appointment NewIntakeAppointment(
        Mechanic mechanic,
        Vehicle vehicle,
        string taskDescription,
        DateTime scheduledDateUtc,
        DateTime dueDateTimeUtc)
    {
        var appointment = new Appointment
        {
            ScheduledDate = scheduledDateUtc,
            IntakeCreatedAt = DateTime.UtcNow,
            DueDateTime = dueDateTimeUtc,
            TaskDescription = taskDescription,
            Status = ProgressStatus.InProgress,
            Vehicle = vehicle,
            Mechanics = new List<Mechanic> { mechanic }
        };

        if (vehicle.Id > 0)
        {
            appointment.VehicleId = vehicle.Id;
        }

        return appointment;
    }

    /** Attaches the built graph inside the cleared tracker: keyless rows are inserted, loaded ones stay unchanged. */
    private static async Task<IResult?> SaveIntakeAppointmentAsync(
        Appointment appointment,
        AutoServiceDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        try
        {
            await db.ExecuteInTransactionAsync(
                async (transaction, token) =>
                {
                    db.Appointments.Attach(appointment);
                    await db.SaveChangesAsync(token);
                    await transaction.CommitAsync(token);
                    return true;
                },
                cancellationToken);

            return null;
        }
        catch (DbUpdateException ex) when (UniqueConstraintDetection.IsUniqueConstraintViolation(ex))
        {
            logger.LogWarning("Intake creation failed due to unique constraint conflict.");
            return ApiProblem.Conflict("Unable to create intake due to conflicting customer or vehicle data.");
        }
    }
}

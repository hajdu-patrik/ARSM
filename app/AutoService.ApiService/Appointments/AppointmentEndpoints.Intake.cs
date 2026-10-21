using AutoService.ApiService.Appointments.Realtime;
using System.Security.Claims;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Linking;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Normalization;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
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

        var customer = await db.Customers
            .FirstOrDefaultAsync(c => c.Email == normalizedEmail, cancellationToken);

        var linkedMechanicForEmail = customer is null
            ? await db.Mechanics.FirstOrDefaultAsync(m => m.Email == normalizedEmail, cancellationToken)
            : null;

        if (customer is null && linkedMechanicForEmail is not null)
        {
            var mechanicOwnedCustomerEmail = CustomerOwnerLinking.BuildMechanicOwnedCustomerEmail(linkedMechanicForEmail.Id);
            customer = await db.Customers
                .FirstOrDefaultAsync(c => c.Email == mechanicOwnedCustomerEmail, cancellationToken);
            normalizedEmail = mechanicOwnedCustomerEmail;
        }

        var creatingCustomer = customer is null;
        if (creatingCustomer)
        {
            var (customerError, newCustomer) = await CreateIntakeCustomerAsync(
                request, linkedMechanicForEmail, normalizedEmail, db, logger, cancellationToken);
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

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            if (creatingCustomer)
            {
                db.Customers.Add(customer!);
            }

            if (!usesExistingVehicle)
            {
                db.Vehicles.Add(vehicle);
            }

            db.Appointments.Add(appointment);

            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (Data.UniqueConstraintDetection.IsUniqueConstraintViolation(ex))
        {
            await transaction.RollbackAsync(cancellationToken);
            logger.LogWarning("Intake creation failed due to unique constraint conflict.");
            return ApiProblem.Conflict("Unable to create intake due to conflicting customer or vehicle data.");
        }

        logger.LogInformation(
            "Intake created appointment {AppointmentId} by mechanic {MechanicId}. CreatedCustomer: {CreatedCustomer}, UsedExistingVehicle: {UsedExistingVehicle}.",
            appointment.Id,
            mechanicId,
            creatingCustomer,
            usesExistingVehicle);
        PublishAppointmentChanged(broadcaster, appointment.Id);

        return Results.Created($"/api/appointments/{appointment.Id}", ToDto(appointment));
    }
}

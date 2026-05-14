using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Appointments;

public static partial class AppointmentEndpoints
{
    /**
     * Creates an appointment for an existing customer/vehicle pair.
     * Endpoint: POST /api/customers/{customerId}/appointments (AdminOnly).
     *
     * @param customerId Target customer ID.
     * @param request Appointment creation payload.
     * @param db Database context.
     * @param loggerFactory Logger factory used to create endpoint logger.
     * @param cancellationToken Request cancellation token.
     * @return Created appointment DTO or validation/conflict result.
     */
    private static async Task<IResult> CreateForCustomerAsync(
        int customerId,
        CreateCustomerAppointmentRequest request,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var logger = loggerFactory.CreateLogger("AppointmentEndpoints.CreateForCustomer");

        var validationResult = ValidateCreateForCustomerRequest(request, out var taskDescription, out var uniqueMechanicIds);
        if (validationResult is not null)
        {
            return validationResult;
        }

        var customerExists = await db.Customers
            .AnyAsync(customer => customer.Id == customerId, cancellationToken);

        if (!customerExists)
        {
            logger.LogInformation("CreateForCustomer failed: customer {CustomerId} not found.", customerId);
            return AppointmentProblem("Customer not found.", StatusCodes.Status404NotFound);
        }

        var vehicle = await db.Vehicles
            .Include(v => v.Customer)
            .FirstOrDefaultAsync(v => v.Id == request.VehicleId, cancellationToken);

        if (vehicle is null)
        {
            logger.LogInformation("CreateForCustomer failed: vehicle {VehicleId} not found.", request.VehicleId);
            return AppointmentProblem("Vehicle not found.", StatusCodes.Status404NotFound);
        }

        if (vehicle.CustomerId != customerId)
        {
            logger.LogWarning("CreateForCustomer rejected: vehicle {VehicleId} does not belong to customer {CustomerId}.", request.VehicleId, customerId);
            return AppointmentProblem("Vehicle does not belong to the specified customer.", StatusCodes.Status422UnprocessableEntity);
        }

        var mechanics = await db.Mechanics
            .Where(m => uniqueMechanicIds.Contains(m.Id))
            .ToListAsync(cancellationToken);

        if (mechanics.Count != uniqueMechanicIds.Length)
        {
            logger.LogWarning("CreateForCustomer rejected: one or more mechanic IDs are invalid.");
            return AppointmentProblem("One or more mechanicIds are invalid.", StatusCodes.Status422UnprocessableEntity);
        }

        var scheduledDateUtc = NormalizeScheduledDateUtc(request.ScheduledDate);
        var appointment = CreateCustomerAppointment(vehicle, mechanics, taskDescription, scheduledDateUtc);

        db.Appointments.Add(appointment);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("CreateForCustomer created appointment {AppointmentId} for customer {CustomerId}.", appointment.Id, customerId);

        return Results.Created($"/api/appointments/{appointment.Id}", ToDto(appointment));
    }

    /**
     * Validates an admin-created customer appointment payload before entity loading.
     *
     * @param request Appointment creation payload.
     * @param taskDescription Trimmed task description when validation succeeds.
     * @param uniqueMechanicIds Distinct mechanic IDs when validation succeeds.
     * @return Problem result when validation fails; otherwise {@code null}.
     */
    private static IResult? ValidateCreateForCustomerRequest(
        CreateCustomerAppointmentRequest request,
        out string taskDescription,
        out int[] uniqueMechanicIds)
    {
        taskDescription = request.TaskDescription?.Trim() ?? string.Empty;
        uniqueMechanicIds = [];

        if (request.VehicleId <= 0)
        {
            return AppointmentProblem("VehicleId must be a positive integer.", StatusCodes.Status422UnprocessableEntity);
        }

        if (string.IsNullOrWhiteSpace(taskDescription))
        {
            return AppointmentProblem("TaskDescription is required.", StatusCodes.Status422UnprocessableEntity);
        }

        if (taskDescription.Length > 200)
        {
            return AppointmentProblem("TaskDescription must be at most 200 characters.", StatusCodes.Status422UnprocessableEntity);
        }

        if (request.MechanicIds is null || request.MechanicIds.Count == 0)
        {
            return AppointmentProblem("At least one mechanic must be assigned.", StatusCodes.Status422UnprocessableEntity);
        }

        if (request.MechanicIds.Any(mechanicId => mechanicId <= 0))
        {
            return AppointmentProblem("MechanicIds must contain positive values only.", StatusCodes.Status422UnprocessableEntity);
        }

        uniqueMechanicIds = request.MechanicIds.Distinct().ToArray();
        if (uniqueMechanicIds.Length != request.MechanicIds.Count)
        {
            return AppointmentProblem("MechanicIds must be unique.", StatusCodes.Status422UnprocessableEntity);
        }

        if (request.ScheduledDate == default)
        {
            return AppointmentProblem("ScheduledDate is required.", StatusCodes.Status422UnprocessableEntity);
        }

        return null;
    }

    private static IResult AppointmentProblem(string detail, int statusCode) => Results.Problem(
        detail: detail,
        statusCode: statusCode);

    /**
     * Normalizes request dates to UTC while preserving prior unspecified-kind semantics.
     *
     * @param scheduledDate Requested scheduled date.
     * @return UTC scheduled date used for persistence.
     */
    private static DateTime NormalizeScheduledDateUtc(DateTime scheduledDate) => scheduledDate.Kind switch
    {
        DateTimeKind.Utc => scheduledDate,
        DateTimeKind.Local => scheduledDate.ToUniversalTime(),
        _ => DateTime.SpecifyKind(scheduledDate, DateTimeKind.Utc)
    };

    /**
     * Creates the appointment aggregate for the validated customer/vehicle/mechanic inputs.
     *
     * @param vehicle Vehicle selected for the appointment.
     * @param mechanics Mechanics assigned to the appointment.
     * @param taskDescription Validated task description.
     * @param scheduledDateUtc Normalized UTC scheduled date.
     * @return Appointment ready to be persisted.
     */
    private static Appointment CreateCustomerAppointment(
        Vehicle vehicle,
        List<Mechanic> mechanics,
        string taskDescription,
        DateTime scheduledDateUtc) => new()
        {
            ScheduledDate = scheduledDateUtc,
            IntakeCreatedAt = DateTime.UtcNow,
            DueDateTime = scheduledDateUtc,
            TaskDescription = taskDescription,
            Status = ProgressStatus.InProgress,
            VehicleId = vehicle.Id,
            Vehicle = vehicle,
            Mechanics = mechanics
        };
}
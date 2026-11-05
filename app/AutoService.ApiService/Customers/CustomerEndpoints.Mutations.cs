using AutoService.ApiService.Appointments.Realtime;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Identity;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.Customers;

public static partial class CustomerEndpoints
{
    private static async Task<IResult> CreateCustomerAsync(
        CreateCustomerRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var input = request.ToInput();
        var fieldError = input.GetFieldError();
        if (fieldError is not null)
        {
            return ApiProblem.Unprocessable(fieldError);
        }

        var contactError = input.NormalizeContact(out var normalizedEmail, out var normalizedPhone);
        if (contactError is not null)
        {
            return ApiProblem.Unprocessable(contactError);
        }

        var lengthErrors = input.GetLengthErrors(normalizedEmail, normalizedPhone);
        if (lengthErrors.Count > 0)
        {
            return Results.ValidationProblem(lengthErrors);
        }

        var conflict = await CustomerInput.FindContactConflictAsync(db, normalizedEmail, normalizedPhone, null, cancellationToken);
        if (conflict is not null)
        {
            return ApiProblem.Conflict(conflict);
        }

        var customer = new Customer(input.ToFullName(), normalizedEmail, normalizedPhone);

        db.Customers.Add(customer);
        var raceConflict = await UniqueConstraintDetection.SaveOrConflictAsync(
            db,
            token => CustomerInput.FindContactConflictAsync(db, normalizedEmail, normalizedPhone, null, token),
            CustomerInput.EmailTakenDetail,
            cancellationToken);
        if (raceConflict is not null)
        {
            return raceConflict;
        }

        var dto = new CustomerDto(
            customer.Id,
            customer.Name.FirstName,
            customer.Name.MiddleName,
            customer.Name.LastName,
            customer.Email,
            customer.PhoneNumber,
            0,
            []);

        return Results.Created($"/api/customers/{customer.Id}", dto);
    }

    private static async Task<IResult> UpdateCustomerAsync(
        int id,
        UpdateCustomerRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var input = request.ToInput();
        var fieldError = input.GetFieldError();
        if (fieldError is not null)
        {
            return ApiProblem.Unprocessable(fieldError);
        }

        var customer = await db.Customers
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer is null)
        {
            return ApiProblem.NotFound("Customer not found.");
        }

        var contactError = input.NormalizeContact(out var normalizedEmail, out var normalizedPhone);
        if (contactError is not null)
        {
            return ApiProblem.Unprocessable(contactError);
        }

        var lengthErrors = input.GetLengthErrors(normalizedEmail, normalizedPhone);
        if (lengthErrors.Count > 0)
        {
            return Results.ValidationProblem(lengthErrors);
        }

        var conflict = await CustomerInput.FindContactConflictAsync(db, normalizedEmail, normalizedPhone, id, cancellationToken);
        if (conflict is not null)
        {
            return ApiProblem.Conflict(conflict);
        }

        customer.Name = input.ToFullName();
        customer.Email = normalizedEmail;
        customer.PhoneNumber = normalizedPhone;

        var raceConflict = await UniqueConstraintDetection.SaveOrConflictAsync(
            db,
            token => CustomerInput.FindContactConflictAsync(db, normalizedEmail, normalizedPhone, id, token),
            CustomerInput.EmailTakenDetail,
            cancellationToken,
            ApiProblem.NotFound("Customer not found."));

        return raceConflict ?? Results.NoContent();
    }

    private static async Task<IResult> DeleteCustomerAsync(
        int id,
        HttpContext httpContext,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        IAppointmentUpdateBroadcaster broadcaster,
        CancellationToken cancellationToken)
    {
        var customer = await db.Customers
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer is null)
        {
            return ApiProblem.NotFound("Customer not found.");
        }

        // The FK cascade deletes these appointments, so live subscribers are told about each one after the commit.
        var appointmentIds = await db.Appointments
            .Where(a => a.Vehicle.CustomerId == id)
            .Select(a => a.Id)
            .ToListAsync(cancellationToken);

        db.Customers.Remove(customer);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // A parallel delete removed the row first; answer like a sequential repeat.
            return ApiProblem.NotFound("Customer not found.");
        }

        broadcaster.PublishAppointmentsChanged(appointmentIds);

        loggerFactory.CreateLogger("CustomerEndpoints.Delete").LogInformation(
            "Customer {CustomerId} deleted with its vehicles, appointments and quotes by admin {ActorPersonId}.",
            id,
            httpContext.User.GetPersonIdOrDefault());

        return Results.NoContent();
    }
}

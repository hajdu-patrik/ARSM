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
        await db.SaveChangesAsync(cancellationToken);

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

        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> DeleteCustomerAsync(
        int id,
        HttpContext httpContext,
        AutoServiceDbContext db,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        var customer = await db.Customers
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer is null)
        {
            return ApiProblem.NotFound("Customer not found.");
        }

        db.Customers.Remove(customer);
        await db.SaveChangesAsync(cancellationToken);

        loggerFactory.CreateLogger("CustomerEndpoints.Delete").LogInformation(
            "Customer {CustomerId} deleted with its vehicles, appointments and quotes by admin {ActorPersonId}.",
            id,
            httpContext.User.GetPersonIdOrDefault());

        return Results.NoContent();
    }
}

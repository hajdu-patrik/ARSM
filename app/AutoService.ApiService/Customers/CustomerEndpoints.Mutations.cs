using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
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
        var nameError = input.GetNameError();
        if (nameError is not null)
        {
            return ApiProblem.Unprocessable(nameError);
        }

        var contactError = input.NormalizeContact(out var normalizedEmail, out var normalizedPhone);
        if (contactError is not null)
        {
            return ApiProblem.Unprocessable(contactError);
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
        var nameError = input.GetNameError();
        if (nameError is not null)
        {
            return ApiProblem.Unprocessable(nameError);
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
        AutoServiceDbContext db,
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

        return Results.NoContent();
    }
}

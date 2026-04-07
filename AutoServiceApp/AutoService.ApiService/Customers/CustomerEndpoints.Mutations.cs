using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using AutoService.ApiService.Models.UniqueTypes;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Customers;

public static partial class CustomerEndpoints
{
    private static async Task<IResult> CreateCustomerAsync(
        CreateCustomerRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName) ||
            string.IsNullOrWhiteSpace(request.Email))
        {
            return Results.Problem(
                detail: "FirstName, LastName, and Email are required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var emailExists = await db.People
            .AnyAsync(p => p.Email == normalizedEmail, cancellationToken);

        if (emailExists)
        {
            return Results.Problem(
                detail: "A person with this email already exists.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var customer = new Customer(
            new FullName(request.FirstName.Trim(), request.MiddleName?.Trim(), request.LastName.Trim()),
            normalizedEmail,
            request.PhoneNumber?.Trim());

        db.Customers.Add(customer);
        await db.SaveChangesAsync(cancellationToken);

        var dto = new CustomerDto(
            customer.Id,
            customer.Name.FirstName,
            customer.Name.MiddleName,
            customer.Name.LastName,
            customer.Email,
            customer.PhoneNumber,
            0);

        return Results.Created($"/api/customers/{customer.Id}", dto);
    }

    private static async Task<IResult> UpdateCustomerAsync(
        int id,
        UpdateCustomerRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName) ||
            string.IsNullOrWhiteSpace(request.Email))
        {
            return Results.Problem(
                detail: "FirstName, LastName, and Email are required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var customer = await db.Customers
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer is null)
        {
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var emailConflict = await db.People
            .AnyAsync(p => p.Email == normalizedEmail && p.Id != id, cancellationToken);

        if (emailConflict)
        {
            return Results.Problem(
                detail: "A person with this email already exists.",
                statusCode: StatusCodes.Status409Conflict);
        }

        customer.Name = new FullName(request.FirstName.Trim(), request.MiddleName?.Trim(), request.LastName.Trim());
        customer.Email = normalizedEmail;
        customer.PhoneNumber = request.PhoneNumber?.Trim();

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
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        db.Customers.Remove(customer);
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }
}

using AutoService.ApiService.Identity;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
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

        if (!ContactNormalization.IsValidName(request.FirstName.Trim()))
        {
            return Results.Problem(
                detail: ValidationMessages.InvalidFirstName,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!ContactNormalization.IsValidName(request.LastName.Trim()))
        {
            return Results.Problem(
                detail: ValidationMessages.InvalidLastName,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!string.IsNullOrWhiteSpace(request.MiddleName) && !ContactNormalization.IsValidName(request.MiddleName.Trim()))
        {
            return Results.Problem(
                detail: ValidationMessages.InvalidMiddleName,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!ContactNormalization.TryNormalizeEmail(request.Email, out var normalizedEmail))
        {
            return Results.Problem(
                detail: ValidationMessages.InvalidEmail,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var normalizedPhone = ContactNormalization.NormalizeOptional(request.PhoneNumber);
        if (normalizedPhone is not null &&
            !ContactNormalization.TryNormalizeHungarianPhoneNumber(normalizedPhone, out normalizedPhone))
        {
            return Results.Problem(
                detail: ValidationMessages.InvalidPhone,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

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
            normalizedPhone);

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

        if (!ContactNormalization.IsValidName(request.FirstName.Trim()))
        {
            return Results.Problem(
                detail: ValidationMessages.InvalidFirstName,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!ContactNormalization.IsValidName(request.LastName.Trim()))
        {
            return Results.Problem(
                detail: ValidationMessages.InvalidLastName,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!string.IsNullOrWhiteSpace(request.MiddleName) && !ContactNormalization.IsValidName(request.MiddleName.Trim()))
        {
            return Results.Problem(
                detail: ValidationMessages.InvalidMiddleName,
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

        if (!ContactNormalization.TryNormalizeEmail(request.Email, out var normalizedEmail))
        {
            return Results.Problem(
                detail: ValidationMessages.InvalidEmail,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var normalizedPhone = ContactNormalization.NormalizeOptional(request.PhoneNumber);
        if (normalizedPhone is not null &&
            !ContactNormalization.TryNormalizeHungarianPhoneNumber(normalizedPhone, out normalizedPhone))
        {
            return Results.Problem(
                detail: ValidationMessages.InvalidPhone,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

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
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        db.Customers.Remove(customer);
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }
}

using AutoService.ApiService.Identity;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
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
        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName) ||
            string.IsNullOrWhiteSpace(request.Email))
        {
            return ApiProblem.Unprocessable("FirstName, LastName, and Email are required.");
        }

        var firstNameError = NameFieldsValidator.GetNameError(request.FirstName.Trim(), "FirstName");
        if (firstNameError is not null)
        {
            return ApiProblem.Unprocessable(firstNameError);
        }

        var lastNameError = NameFieldsValidator.GetNameError(request.LastName.Trim(), "LastName");
        if (lastNameError is not null)
        {
            return ApiProblem.Unprocessable(lastNameError);
        }

        if (!string.IsNullOrWhiteSpace(request.MiddleName))
        {
            var middleNameError = NameFieldsValidator.GetNameError(request.MiddleName.Trim(), "MiddleName");
            if (middleNameError is not null)
            {
                return ApiProblem.Unprocessable(middleNameError);
            }
        }

        if (!ContactNormalization.TryNormalizeEmail(request.Email, out var normalizedEmail))
        {
            return ApiProblem.Unprocessable(ValidationMessages.InvalidEmail);
        }

        var normalizedPhone = ContactNormalization.NormalizeOptional(request.PhoneNumber);
        if (normalizedPhone is not null &&
            !ContactNormalization.TryNormalizeEuPhoneNumber(normalizedPhone, out normalizedPhone))
        {
            return ApiProblem.Unprocessable(ValidationMessages.InvalidPhone);
        }

        var emailExists = await db.People
            .AnyAsync(p => p.Email == normalizedEmail, cancellationToken);

        if (emailExists)
        {
            return ApiProblem.Conflict("A person with this email already exists.");
        }

        if (normalizedPhone is not null)
        {
            var phoneExists = await db.People
                .AnyAsync(p => p.PhoneNumber == normalizedPhone, cancellationToken);

            if (phoneExists)
            {
                return ApiProblem.Conflict("A person with this phone number already exists.");
            }
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
        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName) ||
            string.IsNullOrWhiteSpace(request.Email))
        {
            return ApiProblem.Unprocessable("FirstName, LastName, and Email are required.");
        }

        var firstNameError = NameFieldsValidator.GetNameError(request.FirstName.Trim(), "FirstName");
        if (firstNameError is not null)
        {
            return ApiProblem.Unprocessable(firstNameError);
        }

        var lastNameError = NameFieldsValidator.GetNameError(request.LastName.Trim(), "LastName");
        if (lastNameError is not null)
        {
            return ApiProblem.Unprocessable(lastNameError);
        }

        if (!string.IsNullOrWhiteSpace(request.MiddleName))
        {
            var middleNameError = NameFieldsValidator.GetNameError(request.MiddleName.Trim(), "MiddleName");
            if (middleNameError is not null)
            {
                return ApiProblem.Unprocessable(middleNameError);
            }
        }

        var customer = await db.Customers
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer is null)
        {
            return ApiProblem.NotFound("Customer not found.");
        }

        if (!ContactNormalization.TryNormalizeEmail(request.Email, out var normalizedEmail))
        {
            return ApiProblem.Unprocessable(ValidationMessages.InvalidEmail);
        }

        var normalizedPhone = ContactNormalization.NormalizeOptional(request.PhoneNumber);
        if (normalizedPhone is not null &&
            !ContactNormalization.TryNormalizeEuPhoneNumber(normalizedPhone, out normalizedPhone))
        {
            return ApiProblem.Unprocessable(ValidationMessages.InvalidPhone);
        }

        var emailConflict = await db.People
            .AnyAsync(p => p.Email == normalizedEmail && p.Id != id, cancellationToken);

        if (emailConflict)
        {
            return ApiProblem.Conflict("A person with this email already exists.");
        }

        if (normalizedPhone is not null)
        {
            var phoneConflict = await db.People
                .AnyAsync(p => p.PhoneNumber == normalizedPhone && p.Id != id, cancellationToken);

            if (phoneConflict)
            {
                return ApiProblem.Conflict("A person with this phone number already exists.");
            }
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
            return ApiProblem.NotFound("Customer not found.");
        }

        db.Customers.Remove(customer);
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }
}

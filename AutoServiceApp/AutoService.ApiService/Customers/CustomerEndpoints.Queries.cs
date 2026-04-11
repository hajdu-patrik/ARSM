using AutoService.ApiService.Identity;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Security;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Customers;

public static partial class CustomerEndpoints
{
    private static async Task<IResult> ListCustomersAsync(
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var customers = await db.Customers
            .OrderBy(c => c.Name.LastName)
            .ThenBy(c => c.Name.FirstName)
            .Select(c => new CustomerDto(
                c.Id,
                c.Name.FirstName,
                c.Name.MiddleName,
                c.Name.LastName,
                c.Email,
                c.PhoneNumber,
                c.Vehicles.Count))
            .ToListAsync(cancellationToken);

        return Results.Ok(customers);
    }

    private static async Task<IResult> GetCustomerAsync(
        int id,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var customer = await db.Customers
            .Include(c => c.Vehicles)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer is null)
        {
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var dto = new CustomerWithVehiclesDto(
            customer.Id,
            customer.Name.FirstName,
            customer.Name.MiddleName,
            customer.Name.LastName,
            customer.Email,
            customer.PhoneNumber,
            customer.Vehicles.Select(v => new VehicleSummaryDto(
                v.Id,
                v.LicensePlate,
                v.Brand,
                v.Model,
                v.Year)).ToList());

        return Results.Ok(dto);
    }

    private static async Task<IResult> GetCustomerByEmailAsync(
        string email,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (!ContactNormalization.TryNormalizeEmail(email, out var normalizedEmail))
        {
            return Results.Problem(
                detail: ValidationMessages.InvalidEmail,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var customer = await db.Customers
            .AsNoTracking()
            .Include(c => c.Vehicles)
            .FirstOrDefaultAsync(c => c.Email == normalizedEmail, cancellationToken);

        if (customer is null)
        {
            var mechanic = await db.Mechanics
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.Email == normalizedEmail, cancellationToken);

            if (mechanic is not null)
            {
                var mechanicOwnedCustomerEmail = CustomerOwnerLinking.BuildMechanicOwnedCustomerEmail(mechanic.Id);
                customer = await db.Customers
                    .AsNoTracking()
                    .Include(c => c.Vehicles)
                    .FirstOrDefaultAsync(c => c.Email == mechanicOwnedCustomerEmail, cancellationToken);
            }
        }

        if (customer is null)
        {
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var dto = new SchedulerCustomerLookupDto(
            customer.Id,
            customer.Name.FirstName,
            customer.Name.MiddleName,
            customer.Name.LastName,
            customer.Email,
            customer.PhoneNumber,
            customer.Vehicles
                .OrderBy(v => v.LicensePlate)
                .Select(v => new SchedulerVehicleLookupDto(
                    v.Id,
                    v.LicensePlate,
                    v.Brand,
                    v.Model,
                    v.Year,
                    v.MileageKm,
                    v.EnginePowerHp,
                    v.EngineTorqueNm))
                .ToList());

        return Results.Ok(dto);
    }

    // Extended DTO for single-customer retrieval (includes vehicles).
    private sealed record CustomerWithVehiclesDto(
        int Id,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber,
        IReadOnlyList<VehicleSummaryDto> Vehicles);

    private sealed record VehicleSummaryDto(
        int Id,
        string LicensePlate,
        string Brand,
        string Model,
        int Year);

    private sealed record SchedulerCustomerLookupDto(
        int Id,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber,
        IReadOnlyList<SchedulerVehicleLookupDto> Vehicles);

    private sealed record SchedulerVehicleLookupDto(
        int Id,
        string LicensePlate,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerHp,
        int EngineTorqueNm);
}

using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Customers;

public static partial class CustomerEndpoints
{
    private const int DefaultCustomerLookupLimit = 10;
    private const int MaxCustomerLookupLimit = 25;

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

                // Mechanic email remains a valid lookup before intake materializes its linked customer record.
                if (customer is null)
                {
                    return Results.Ok(new SchedulerCustomerLookupDto(
                        mechanic.Id,
                        mechanic.Name.FirstName,
                        mechanic.Name.MiddleName,
                        mechanic.Name.LastName,
                        mechanic.Email,
                        mechanic.PhoneNumber,
                        []));
                }
            }
        }

        if (customer is null)
        {
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        return Results.Ok(ToSchedulerCustomerLookupDto(customer));
    }

    private static async Task<IResult> GetCustomerByLicensePlateAsync(
        string? licensePlate,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(licensePlate))
        {
            return Results.Problem(
                detail: "LicensePlate is required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(licensePlate, out var normalizedPlate, out var plateValidationError))
        {
            return Results.Problem(
                detail: plateValidationError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var matchedVehicle = await db.Vehicles
            .AsNoTracking()
            .Where(v => v.LicensePlate == normalizedPlate)
            .Select(v => new { v.Id, v.CustomerId })
            .FirstOrDefaultAsync(cancellationToken);

        if (matchedVehicle is null)
        {
            return Results.Problem(
                detail: "Vehicle not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var customer = await db.Customers
            .AsNoTracking()
            .Include(c => c.Vehicles)
            .FirstOrDefaultAsync(c => c.Id == matchedVehicle.CustomerId, cancellationToken);

        if (customer is null)
        {
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        return Results.Ok(ToSchedulerCustomerLookupDto(customer, matchedVehicle.Id));
    }

    private static async Task<IResult> GetCustomersByNameAsync(
        string? name,
        int? limit,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var normalizedName = ContactNormalization.NormalizeOptional(name);
        if (normalizedName is null)
        {
            return Results.Problem(
                detail: "Name is required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var searchTerm = normalizedName.ToUpperInvariant();
        var compactSearchTerm = searchTerm
            .Replace(" ", string.Empty, StringComparison.Ordinal)
            .Replace("-", string.Empty, StringComparison.Ordinal);
        var boundedLimit = NormalizeCustomerLookupLimit(limit);
        var customers = await db.Customers
            .AsNoTracking()
            .Include(c => c.Vehicles)
            .Where(c =>
                c.Name.FirstName.ToUpper().Contains(searchTerm) ||
                (c.Name.MiddleName != null && c.Name.MiddleName.ToUpper().Contains(searchTerm)) ||
                c.Name.LastName.ToUpper().Contains(searchTerm) ||
                (c.Name.FirstName + " " + c.Name.LastName).ToUpper().Contains(searchTerm) ||
                (c.Name.MiddleName != null &&
                 (c.Name.FirstName + " " + c.Name.MiddleName + " " + c.Name.LastName).ToUpper().Contains(searchTerm)) ||
                c.Vehicles.Any(v =>
                    v.LicensePlate.ToUpper().Contains(searchTerm) ||
                    v.LicensePlate
                        .Replace(" ", string.Empty)
                        .Replace("-", string.Empty)
                        .ToUpper()
                        .Contains(compactSearchTerm)))
            .OrderBy(c => c.Name.LastName)
            .ThenBy(c => c.Name.FirstName)
            .Take(boundedLimit)
            .ToListAsync(cancellationToken);

        return Results.Ok(customers.Select(c => ToSchedulerCustomerLookupDto(c)).ToList());
    }

    private static int NormalizeCustomerLookupLimit(int? limit)
        => Math.Clamp(limit ?? DefaultCustomerLookupLimit, 1, MaxCustomerLookupLimit);

    private static SchedulerCustomerLookupDto ToSchedulerCustomerLookupDto(Customer customer, int? matchedVehicleId = null) => new(
        customer.Id,
        customer.Name.FirstName,
        customer.Name.MiddleName,
        customer.Name.LastName,
        customer.Email,
        customer.PhoneNumber,
        customer.Vehicles
            .OrderBy(v => v.LicensePlate)
            .Select(ToSchedulerVehicleLookupDto)
            .ToList(),
        matchedVehicleId);

    private static SchedulerVehicleLookupDto ToSchedulerVehicleLookupDto(Vehicle vehicle) => new(
        vehicle.Id,
        vehicle.LicensePlate,
        vehicle.Vin,
        vehicle.Brand,
        vehicle.Model,
        vehicle.Year,
        vehicle.MileageKm,
        vehicle.EnginePowerKw,
        vehicle.DrivetrainType.ToString());

    /** Scheduler customer lookup payload with optional matched vehicle context. */
    private sealed record SchedulerCustomerLookupDto(
        int Id,
        string FirstName,
        string? MiddleName,
        string LastName,
        string Email,
        string? PhoneNumber,
        IReadOnlyList<SchedulerVehicleLookupDto> Vehicles,
        int? MatchedVehicleId = null);

    /** Vehicle summary payload used by scheduler customer lookup responses. */
    private sealed record SchedulerVehicleLookupDto(
        int Id,
        string LicensePlate,
        string Vin,
        string Brand,
        string Model,
        int Year,
        int MileageKm,
        int EnginePowerKw,
        string DrivetrainType);
}

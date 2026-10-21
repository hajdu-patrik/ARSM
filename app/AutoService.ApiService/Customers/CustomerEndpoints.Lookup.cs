using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Linking;
using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;

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
            return ApiProblem.Unprocessable(ValidationMessages.InvalidEmail);
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
            return ApiProblem.NotFound("Customer not found.");
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
            return ApiProblem.Unprocessable("LicensePlate is required.");
        }

        if (!LicensePlateNormalization.TryNormalizeEuropeanLicensePlate(licensePlate, out var normalizedPlate, out var plateValidationError))
        {
            return ApiProblem.Unprocessable(plateValidationError);
        }

        var matchedVehicle = await db.Vehicles
            .AsNoTracking()
            .Where(v => v.LicensePlate == normalizedPlate)
            .Select(v => new { v.Id, v.CustomerId })
            .FirstOrDefaultAsync(cancellationToken);

        if (matchedVehicle is null)
        {
            return ApiProblem.NotFound("Vehicle not found.");
        }

        var customer = await db.Customers
            .AsNoTracking()
            .Include(c => c.Vehicles)
            .FirstOrDefaultAsync(c => c.Id == matchedVehicle.CustomerId, cancellationToken);

        if (customer is null)
        {
            return ApiProblem.NotFound("Customer not found.");
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
            return ApiProblem.Unprocessable("Name is required.");
        }

        var searchTerm = normalizedName.ToUpperInvariant();
        var compactSearchTerm = searchTerm
            .Replace(" ", string.Empty, StringComparison.Ordinal)
            .Replace("-", string.Empty, StringComparison.Ordinal);
        var boundedLimit = NormalizeCustomerLookupLimit(limit);
        // .ToUpper().Contains() (not ILike) matches the pg_trgm GIN indexes' exact upper(...) expressions;
        // split into a name/plate UNION so each side keeps its own index (an OR forces a table scan).
        var nameMatchedCustomerIds = db.Customers
            .Where(c =>
                c.Name.FirstName.ToUpper().Contains(searchTerm) ||
                (c.Name.MiddleName != null && c.Name.MiddleName.ToUpper().Contains(searchTerm)) ||
                c.Name.LastName.ToUpper().Contains(searchTerm) ||
                (c.Name.FirstName + " " + c.Name.LastName).ToUpper().Contains(searchTerm) ||
                (c.Name.MiddleName != null &&
                 (c.Name.FirstName + " " + c.Name.MiddleName + " " + c.Name.LastName).ToUpper().Contains(searchTerm)))
            .Select(c => c.Id);

        var plateMatchedCustomerIds = db.Vehicles
            .Where(v =>
                v.LicensePlate.ToUpper().Contains(searchTerm) ||
                v.LicensePlate
                    .Replace(" ", string.Empty)
                    .Replace("-", string.Empty)
                    .ToUpper()
                    .Contains(compactSearchTerm))
            .Select(v => v.CustomerId);

        var matchedCustomerIds = nameMatchedCustomerIds.Union(plateMatchedCustomerIds);

        var customers = await db.Customers
            .AsNoTracking()
            .Include(c => c.Vehicles)
            .Where(c => matchedCustomerIds.Contains(c.Id))
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
}

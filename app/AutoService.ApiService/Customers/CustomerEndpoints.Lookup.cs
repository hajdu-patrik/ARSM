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
        // Trigram search index: option (a). The predicate stays as it is, and the pg_trgm migration indexes
        // these exact upper(...) expressions with GIN gin_trgm_ops. Npgsql translates
        // .ToUpper().Contains(capturedVariable) to `upper(expr) LIKE @p` (p = escaped '%term%', default
        // backslash escape), which a trigram index can serve. EF.Functions.ILike (option b) would change
        // matches: ILIKE folds both sides with PostgreSQL lower(), whereas the term is upper-cased here by
        // .NET and the column by PostgreSQL upper(), and a raw "%term%" makes a typed % or _ a wildcard.
        // Expressions as generated (the IS NOT NULL guard keeps COALESCE out of the three-part name):
        //   people:   upper("FirstName"), upper("MiddleName"), upper("LastName"),
        //             upper("FirstName" || ' ' || "LastName"),
        //             upper("FirstName" || ' ' || "MiddleName" || ' ' || "LastName")
        //   vehicles: upper("LicensePlate"), upper(replace(replace("LicensePlate", ' ', ''), '-', ''))
        // The predicate is split into a name-id/plate-id UNION, instead of one OR across both tables,
        // because PostgreSQL can only combine indexes across an OR when every branch is index-matched;
        // the vehicle EXISTS branch was not, so an OR containing it forced a full table scan of people.
        // Each UNION branch now matches its own trigram indexes (5 on people, 2 on vehicles).
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

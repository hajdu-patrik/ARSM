using AutoService.ApiService.Data;
using AutoService.ApiService.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace AutoService.ApiService.Vehicles;

public static partial class VehicleEndpoints
{
    private static async Task<IResult> CreateVehicleAsync(
        int customerId,
        CreateVehicleRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.LicensePlate) ||
            string.IsNullOrWhiteSpace(request.Brand) ||
            string.IsNullOrWhiteSpace(request.Model))
        {
            return Results.Problem(
                detail: "LicensePlate, Brand, and Model are required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (request.Year < 1886 || request.Year > 2100)
        {
            return Results.Problem(
                detail: "Year must be between 1886 and 2100.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (request.MileageKm < 0 || request.EnginePowerHp < 0 || request.EngineTorqueNm < 0)
        {
            return Results.Problem(
                detail: "MileageKm, EnginePowerHp, and EngineTorqueNm must be non-negative.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var customerExists = await db.Customers
            .AnyAsync(c => c.Id == customerId, cancellationToken);

        if (!customerExists)
        {
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        if (!TryNormalizeEuropeanLicensePlate(request.LicensePlate, out var plateNormalized, out var plateValidationError))
        {
            return Results.Problem(
                detail: plateValidationError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var plateExists = await db.Vehicles
            .AnyAsync(v => v.LicensePlate == plateNormalized, cancellationToken);

        if (plateExists)
        {
            return Results.Problem(
                detail: "A vehicle with this license plate already exists.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var vehicle = new Vehicle(
            plateNormalized,
            request.Brand.Trim(),
            request.Model.Trim(),
            request.Year,
            request.MileageKm,
            request.EnginePowerHp,
            request.EngineTorqueNm);
        vehicle.CustomerId = customerId;

        db.Vehicles.Add(vehicle);
        await db.SaveChangesAsync(cancellationToken);

        // Load customer for response DTO.
        await db.Entry(vehicle).Reference(v => v.Customer).LoadAsync(cancellationToken);

        var dto = new VehicleDetailDto(
            vehicle.Id,
            vehicle.LicensePlate,
            vehicle.Brand,
            vehicle.Model,
            vehicle.Year,
            vehicle.MileageKm,
            vehicle.EnginePowerHp,
            vehicle.EngineTorqueNm,
            new CustomerSummaryDto(
                vehicle.Customer.Id,
                vehicle.Customer.Name.FirstName,
                vehicle.Customer.Name.MiddleName,
                vehicle.Customer.Name.LastName,
                vehicle.Customer.Email));

        return Results.Created($"/api/vehicles/{vehicle.Id}", dto);
    }

    private static async Task<IResult> UpdateVehicleAsync(
        int id,
        UpdateVehicleRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.LicensePlate) ||
            string.IsNullOrWhiteSpace(request.Brand) ||
            string.IsNullOrWhiteSpace(request.Model))
        {
            return Results.Problem(
                detail: "LicensePlate, Brand, and Model are required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (request.Year < 1886 || request.Year > 2100)
        {
            return Results.Problem(
                detail: "Year must be between 1886 and 2100.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (request.MileageKm < 0 || request.EnginePowerHp < 0 || request.EngineTorqueNm < 0)
        {
            return Results.Problem(
                detail: "MileageKm, EnginePowerHp, and EngineTorqueNm must be non-negative.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var vehicle = await db.Vehicles
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

        if (vehicle is null)
        {
            return Results.Problem(
                detail: "Vehicle not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        if (!TryNormalizeEuropeanLicensePlate(request.LicensePlate, out var plateNormalized, out var plateValidationError))
        {
            return Results.Problem(
                detail: plateValidationError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var plateConflict = await db.Vehicles
            .AnyAsync(v => v.LicensePlate == plateNormalized && v.Id != id, cancellationToken);

        if (plateConflict)
        {
            return Results.Problem(
                detail: "A vehicle with this license plate already exists.",
                statusCode: StatusCodes.Status409Conflict);
        }

        vehicle.LicensePlate = plateNormalized;
        vehicle.Brand = request.Brand.Trim();
        vehicle.Model = request.Model.Trim();
        vehicle.Year = request.Year;
        vehicle.MileageKm = request.MileageKm;
        vehicle.EnginePowerHp = request.EnginePowerHp;
        vehicle.EngineTorqueNm = request.EngineTorqueNm;

        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static bool TryNormalizeEuropeanLicensePlate(
        string rawLicensePlate,
        out string normalizedLicensePlate,
        out string validationError)
    {
        normalizedLicensePlate = string.Empty;
        validationError = string.Empty;

        var trimmed = rawLicensePlate.Trim();
        if (trimmed.Length is < 2 or > 20)
        {
            validationError = "License plate must be between 2 and 20 characters.";
            return false;
        }

        var upperCased = MultiWhitespaceRegex().Replace(trimmed.ToUpperInvariant(), " ");

        if (!EuropeanPlateAllowedCharsRegex().IsMatch(upperCased))
        {
            validationError = "License plate contains unsupported characters. Only European letters, digits, spaces, hyphens, dots, commas, and bullets are allowed.";
            return false;
        }

        foreach (var value in upperCased)
        {
            if (char.IsLetter(value) && !IsSupportedEuropeanLetter(value))
            {
                validationError = "License plate contains non-European letters. Supported scripts are Latin, Greek, and Cyrillic.";
                return false;
            }
        }

        if (!EuropeanPlateBoundaryRegex().IsMatch(upperCased))
        {
            validationError = "License plate must start and end with a letter or digit.";
            return false;
        }

        if (RepeatedSeparatorsRegex().IsMatch(upperCased))
        {
            validationError = "License plate cannot contain repeated separators.";
            return false;
        }

        if (!ContainsDigitRegex().IsMatch(upperCased))
        {
            validationError = "License plate must contain at least one digit.";
            return false;
        }

        normalizedLicensePlate = upperCased;
        return true;
    }

    [GeneratedRegex("\\s+", RegexOptions.CultureInvariant)]
    private static partial Regex MultiWhitespaceRegex();

    [GeneratedRegex("^[\\p{L}\\p{Nd} .,'·•-]+$", RegexOptions.CultureInvariant)]
    private static partial Regex EuropeanPlateAllowedCharsRegex();

    [GeneratedRegex("^[\\p{L}\\p{Nd}](?:[\\p{L}\\p{Nd} .,'·•-]*[\\p{L}\\p{Nd}])?$", RegexOptions.CultureInvariant)]
    private static partial Regex EuropeanPlateBoundaryRegex();

    [GeneratedRegex("[ .,'·•-]{2,}", RegexOptions.CultureInvariant)]
    private static partial Regex RepeatedSeparatorsRegex();

    [GeneratedRegex("\\p{Nd}", RegexOptions.CultureInvariant)]
    private static partial Regex ContainsDigitRegex();

    private static bool IsSupportedEuropeanLetter(char value)
    {
        return IsInRange(value, '\u0041', '\u005A') ||
               IsInRange(value, '\u00C0', '\u00FF') ||
               IsInRange(value, '\u0100', '\u024F') ||
               IsInRange(value, '\u1E00', '\u1EFF') ||
               IsInRange(value, '\u0370', '\u03FF') ||
               IsInRange(value, '\u1F00', '\u1FFF') ||
               IsInRange(value, '\u0400', '\u04FF') ||
               IsInRange(value, '\u0500', '\u052F') ||
               IsInRange(value, '\u1C80', '\u1C8F') ||
               IsInRange(value, '\u2DE0', '\u2DFF') ||
               IsInRange(value, '\uA640', '\uA69F');
    }

    private static bool IsInRange(char value, char minInclusive, char maxInclusive)
        => value >= minInclusive && value <= maxInclusive;

    private static async Task<IResult> DeleteVehicleAsync(
        int id,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var vehicle = await db.Vehicles
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

        if (vehicle is null)
        {
            return Results.Problem(
                detail: "Vehicle not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        db.Vehicles.Remove(vehicle);
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }
}

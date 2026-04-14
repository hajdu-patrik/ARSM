/**
 * VehicleEndpoints.Queries.cs
 *
 * Auto-generated documentation header for this source file.
 */

using AutoService.ApiService.Data;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Vehicles;

/**
 * Backend type for API logic in this file.
 */
public static partial class VehicleEndpoints
{
        private static async Task<IResult> ListCustomerVehiclesAsync(
        int customerId,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var customerExists = await db.Customers
            .AnyAsync(c => c.Id == customerId, cancellationToken);

        if (!customerExists)
        {
            return Results.Problem(
                detail: "Customer not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var vehicles = await db.Vehicles
            .Where(v => v.CustomerId == customerId)
            .Include(v => v.Customer)
            .OrderBy(v => v.Brand)
            .ThenBy(v => v.Model)
            .Select(v => new VehicleDetailDto(
                v.Id,
                v.LicensePlate,
                v.Brand,
                v.Model,
                v.Year,
                v.MileageKm,
                v.EnginePowerHp,
                v.EngineTorqueNm,
                new CustomerSummaryDto(
                    v.Customer.Id,
                    v.Customer.Name.FirstName,
                    v.Customer.Name.MiddleName,
                    v.Customer.Name.LastName,
                    v.Customer.Email)))
            .ToListAsync(cancellationToken);

        return Results.Ok(vehicles);
    }

        private static async Task<IResult> GetVehicleAsync(
        int id,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var vehicle = await db.Vehicles
            .Include(v => v.Customer)
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

        if (vehicle is null)
        {
            return Results.Problem(
                detail: "Vehicle not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

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

        return Results.Ok(dto);
    }
}

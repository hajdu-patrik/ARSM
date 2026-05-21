using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Vehicles;

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
            .AsNoTracking()
            .Where(v => v.CustomerId == customerId)
            .Include(v => v.Customer)
            .OrderBy(v => v.Brand)
            .ThenBy(v => v.Model)
            .ToListAsync(cancellationToken);

        return Results.Ok(vehicles.Select(ToVehicleDetailDto).ToList());
    }

    private static async Task<IResult> GetVehicleAsync(
        int id,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var vehicle = await db.Vehicles
            .AsNoTracking()
            .Include(v => v.Customer)
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);

        if (vehicle is null)
        {
            return Results.Problem(
                detail: "Vehicle not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        return Results.Ok(ToVehicleDetailDto(vehicle));
    }

    private static VehicleDetailDto ToVehicleDetailDto(Vehicle vehicle) => new(
            vehicle.Id,
            vehicle.LicensePlate,
            vehicle.Vin,
            vehicle.Brand,
            vehicle.Model,
            vehicle.Year,
            vehicle.MileageKm,
            vehicle.EnginePowerKw,
            vehicle.DrivetrainType.ToString(),
            new CustomerSummaryDto(
                vehicle.Customer.Id,
                vehicle.Customer.Name.FirstName,
                vehicle.Customer.Name.MiddleName,
                vehicle.Customer.Name.LastName));
}

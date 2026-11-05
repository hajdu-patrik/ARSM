using AutoService.ApiService.Customers;
using AutoService.ApiService.Data;
using AutoService.ApiService.Vehicles;
using AutoService.UnitTests.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace AutoService.UnitTests.Data;

/** PUT on a customer or vehicle deleted in parallel answers the sequential 404, not a 500 (the update matched 0 rows). */
public sealed class RowDeletedInParallelTests
{
    private static readonly Dictionary<string, object?> CustomerRow = new()
    {
        ["Id"] = 7, ["PersonType"] = "Customer", ["FirstName"] = "Béla", ["LastName"] = "Kovács", ["Email"] = "bela@example.com",
    };

    private static readonly Dictionary<string, object?> VehicleRow = new()
    {
        ["Id"] = 7, ["LicensePlate"] = "ABC123", ["Vin"] = "WVWZZZ1JZXW000001", ["Brand"] = "VW", ["Model"] = "Golf",
        ["Year"] = 2010, ["MileageKm"] = 1000, ["EnginePowerKw"] = 66, ["DrivetrainType"] = "Petrol", ["CustomerId"] = 1,
    };

    private static AutoServiceDbContext RowThenParallelDelete(Dictionary<string, object?> row) => TestDbContextFactory.Create(
        new NoConnectionInterceptor(),
        new ScriptedRowsInterceptor(row),
        new ScriptedSaveInterceptor(new DbUpdateConcurrencyException("0 rows affected")));

    [Fact]
    public async Task Updating_a_customer_deleted_in_parallel_answers_404()
    {
        await using var db = RowThenParallelDelete(CustomerRow);
        var request = new CustomerEndpoints.UpdateCustomerRequest("Béla", null, "Kovács", "uj@example.com", null);

        var result = await PrivateStatic.Call<Task<IResult>>(
            typeof(CustomerEndpoints), "UpdateCustomerAsync", 7, request, db, CancellationToken.None);

        ResultAssert.Problem(result, 404, "Customer not found.");
    }

    [Fact]
    public async Task Updating_a_vehicle_deleted_in_parallel_answers_404()
    {
        await using var db = RowThenParallelDelete(VehicleRow);
        var request = new VehicleEndpoints.UpdateVehicleRequest("ABC123", "WVWZZZ1JZXW000001", "VW", "Golf", 2011, 2000, 66, "Petrol");

        var result = await PrivateStatic.Call<Task<IResult>>(
            typeof(VehicleEndpoints), "UpdateVehicleAsync", 7, request, db, CancellationToken.None);

        ResultAssert.Problem(result, 404, "Vehicle not found.");
    }
}

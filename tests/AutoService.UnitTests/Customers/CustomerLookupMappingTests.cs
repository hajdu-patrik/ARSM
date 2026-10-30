using System.Linq.Expressions;
using AutoService.ApiService.Customers;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.UnitTests.Http;

namespace AutoService.UnitTests.Customers;

/** The scheduler lookup mapping, its limit clamp and the customer search predicate. */
public sealed class CustomerLookupMappingTests
{
    private static Customer CustomerWith(string first, string? middle, string last, params string[] plates)
    {
        var customer = PrivateStatic.WithId(new Customer(new FullName(first, middle, last), "c@example.test", "+36201234567"), 7);
        var id = 100;
        foreach (var plate in plates)
        {
            customer.Vehicles.Add(PrivateStatic.WithId(
                new Vehicle(plate, "WVWZZZAUZJW1234" + id, "Škoda", "Octavia", 2018, 1000, 85, DrivetrainType.Petrol), id++));
        }

        return customer;
    }

    private static bool Matches(Customer customer, string term) =>
        PrivateStatic.Call<Expression<Func<Customer, bool>>>(typeof(CustomerEndpoints), "CustomerSearchPredicate", term)
            .Compile()(customer);

    [Theory]
    [InlineData(null, 10)]
    [InlineData(0, 1)]
    [InlineData(-4, 1)]
    [InlineData(1, 1)]
    [InlineData(25, 25)]
    [InlineData(26, 25)]
    [InlineData(int.MaxValue, 25)]
    public void NormalizeCustomerLookupLimit_defaults_to_10_and_clamps_to_1_through_25(int? limit, int expected)
    {
        Assert.Equal(expected, PrivateStatic.Call<int>(typeof(CustomerEndpoints), "NormalizeCustomerLookupLimit", [limit]));
    }

    [Fact]
    public void The_lookup_dto_carries_the_customer_and_lists_vehicles_by_plate()
    {
        var customer = CustomerWith("Anna", "Mária", "Kovács", "ABC-201", "ABC-102");

        var dto = PrivateStatic.Call<CustomerEndpoints.SchedulerCustomerLookupDto>(
            typeof(CustomerEndpoints), "ToSchedulerCustomerLookupDto", customer, (int?)101);

        Assert.Equal((7, "Anna", "Mária", "Kovács"), (dto.Id, dto.FirstName, dto.MiddleName, dto.LastName));
        Assert.Equal(("c@example.test", "+36201234567", (int?)101), (dto.Email, dto.PhoneNumber, dto.MatchedVehicleId));
        Assert.Equal(new[] { "ABC-102", "ABC-201" }, dto.Vehicles.Select(v => v.LicensePlate).ToArray());
    }

    [Fact]
    public void The_vehicle_lookup_dto_names_the_drivetrain_and_keeps_the_specification()
    {
        var vehicle = new Vehicle("ABC-123", "WVWZZZAUZJW123456", "Škoda", "Octavia", 2018, 120000, 85, DrivetrainType.PHEV);

        var dto = PrivateStatic.Call<CustomerEndpoints.SchedulerVehicleLookupDto>(
            typeof(CustomerEndpoints), "ToSchedulerVehicleLookupDto", vehicle);

        Assert.Equal(("ABC-123", "WVWZZZAUZJW123456", "Škoda", "Octavia"), (dto.LicensePlate, dto.Vin, dto.Brand, dto.Model));
        Assert.Equal((2018, 120000, 85, "PHEV"), (dto.Year, dto.MileageKm, dto.EnginePowerKw, dto.DrivetrainType));
    }

    [Theory]
    [InlineData("ANNA")]
    [InlineData("KOVÁCS")]
    [InlineData("MÁR")]
    [InlineData("ANNA KOVÁCS")]
    [InlineData("ANNA MÁRIA KOVÁCS")]
    [InlineData("ABC-1")]
    [InlineData("C-102")]
    public void The_search_matches_names_name_combinations_and_plates_case_insensitively(string term)
    {
        Assert.True(Matches(CustomerWith("Anna", "Mária", "Kovács", "ABC-102"), term));
    }

    [Theory]
    [InlineData("BÉLA")]
    [InlineData("KOVÁCS ANNA")]
    [InlineData("XYZ-999")]
    public void The_search_rejects_terms_that_match_no_name_or_plate(string term)
    {
        Assert.False(Matches(CustomerWith("Anna", "Mária", "Kovács", "ABC-102"), term));
    }

    [Fact]
    public void The_search_copes_with_a_customer_who_has_no_middle_name_and_no_vehicle()
    {
        var customer = CustomerWith("Anna", null, "Kovács");

        Assert.True(Matches(customer, "ANNA KOVÁCS"));
        Assert.False(Matches(customer, "ANNA MÁRIA"));
        Assert.False(Matches(customer, "ABC"));
    }
}

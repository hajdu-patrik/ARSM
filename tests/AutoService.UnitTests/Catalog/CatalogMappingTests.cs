using System.Reflection;
using AutoService.ApiService.Catalog;
using AutoService.ApiService.Domain;

namespace AutoService.UnitTests.Catalog;

/** Each catalog kind maps its own key, price and VAT onto the entity and adds the display-only gross price. */
public sealed class CatalogMappingTests
{
    private const BindingFlags Members = BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public;

    private static object NewCatalog(Type endpoints, string nestedName) =>
        Activator.CreateInstance(endpoints.GetNestedType(nestedName, BindingFlags.NonPublic)!, nonPublic: true)!;

    private static object? Call(object catalog, string method, params object?[] args) =>
        catalog.GetType().GetMethod(method, Members)!.Invoke(catalog, args);

    [Fact]
    public void A_part_is_created_updated_and_shown_with_its_gross_price()
    {
        var catalog = NewCatalog(typeof(PartEndpoints), "PartCatalog");
        var created = (Part)Call(catalog, "Create", new CatalogItemInput("OLF-1", "Olajszűrő", 4500m, 27))!;

        Call(catalog, "Apply", created, new CatalogItemInput("OLF-2", "Levegőszűrő", 5000m, 18));
        var dto = (PartEndpoints.PartDto)Call(catalog, "ToDto", created)!;

        Assert.Equal(("OLF-2", "Levegőszűrő", 5000m, 18), (created.PartNumber, created.Name, created.NetUnitPrice, created.VatRatePercent));
        Assert.Equal(("OLF-2", "Levegőszűrő", 5000m, 5900m, 18), (dto.PartNumber, dto.Name, dto.NetUnitPrice, dto.GrossUnitPrice, dto.VatRatePercent));
        Assert.Equal(0u, dto.Version);
    }

    [Fact]
    public void A_labor_type_maps_the_key_to_code_and_the_price_to_the_hourly_rate()
    {
        var catalog = NewCatalog(typeof(LaborTypeEndpoints), "LaborTypeCatalog");
        var created = (LaborType)Call(catalog, "Create", new CatalogItemInput("OLAJCSERE", "Olajcsere", 9000m, 27))!;

        Call(catalog, "Apply", created, new CatalogItemInput("FEKCSERE", "Fékcsere", 10000m, 5));
        var dto = (LaborTypeEndpoints.LaborTypeDto)Call(catalog, "ToDto", created)!;

        Assert.Equal(("FEKCSERE", "Fékcsere", 10000m, 5), (created.Code, created.Name, created.HourlyNetRate, created.VatRatePercent));
        Assert.Equal(("FEKCSERE", "Fékcsere", 10000m, 10500m, 5), (dto.Code, dto.Name, dto.HourlyNetRate, dto.GrossHourlyRate, dto.VatRatePercent));
    }

    [Theory]
    [InlineData("4500", 27, "5715.00")]
    [InlineData("10.10", 5, "10.61")]
    [InlineData("0", 18, "0")]
    public void The_part_gross_price_is_rounded_to_two_decimals(string net, int vat, string expectedGross)
    {
        var catalog = NewCatalog(typeof(PartEndpoints), "PartCatalog");
        var part = new Part("K", "N", decimal.Parse(net, System.Globalization.CultureInfo.InvariantCulture), vat);

        var dto = (PartEndpoints.PartDto)Call(catalog, "ToDto", part)!;

        Assert.Equal(decimal.Parse(expectedGross, System.Globalization.CultureInfo.InvariantCulture), dto.GrossUnitPrice);
    }
}

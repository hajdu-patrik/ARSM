using AutoService.ApiService.Catalog;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Validation;
using AutoService.UnitTests.Http;

namespace AutoService.UnitTests.Catalog;

/** The shared catalog input rules answer before any database access, in a fixed order, with the kind's key name. */
public sealed class CatalogItemHandlersValidationTests
{
    private sealed class TestCatalog() : CatalogItemHandlers<Part, string>(
        "PartNumber", "/api/parts", "Part not found.", "duplicate", "part_version_conflict")
    {
        protected override Part Create(CatalogItemInput input) => new(input.Key, input.Name, input.NetPrice, input.VatRatePercent);

        protected override void Apply(Part entity, CatalogItemInput input) => entity.Name = input.Name;

        protected override string ToDto(Part entity) => entity.PartNumber;
    }

    private static readonly TestCatalog Handlers = new();

    private static CatalogItemInput Input(string key = "OLF-1", string name = "Olajszűrő", decimal price = 4500m, int vat = 27) =>
        new(key, name, price, vat);

    private static Task<Microsoft.AspNetCore.Http.IResult> Create(CatalogItemInput input) =>
        Handlers.CreateAsync(input, null!, CancellationToken.None);

    private static Task<Microsoft.AspNetCore.Http.IResult> Update(CatalogItemInput input, uint version = 1) =>
        Handlers.UpdateAsync(1, input, version, null!, CancellationToken.None);

    [Theory]
    [InlineData("", "Név")]
    [InlineData("  ", "Név")]
    [InlineData("KEY", "")]
    [InlineData("KEY", "   ")]
    public async Task Create_requires_a_key_and_a_name(string key, string name)
    {
        ResultAssert.Problem(await Create(Input(key, name)), 422, "PartNumber and Name are required.");
    }

    [Fact]
    public async Task Create_refuses_a_key_over_40_and_a_name_over_120_characters()
    {
        ResultAssert.Problem(await Create(Input(key: new string('k', 41))), 422, "PartNumber must be at most 40 characters.");
        ResultAssert.Problem(await Create(Input(name: new string('n', 121))), 422, "Name must be at most 120 characters.");
    }

    [Fact]
    public async Task Create_refuses_a_price_outside_the_money_range()
    {
        ResultAssert.Problem(await Create(Input(price: -0.01m)), 422, ValidationMessages.InvalidMoneyAmount);
        ResultAssert.Problem(await Create(Input(price: 100_000_000.01m)), 422, ValidationMessages.InvalidMoneyAmount);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(19)]
    public async Task Create_refuses_a_vat_rate_outside_5_18_27(int vat)
    {
        ResultAssert.Problem(await Create(Input(vat: vat)), 422, ValidationMessages.InvalidVatRate);
    }

    [Fact]
    public async Task Create_checks_required_then_lengths_then_price_then_vat()
    {
        ResultAssert.Problem(await Create(Input(key: "", price: -1m, vat: 0)), 422, "PartNumber and Name are required.");
        ResultAssert.Problem(await Create(Input(key: new string('k', 41), price: -1m, vat: 0)), 422, "PartNumber must be at most 40 characters.");
        ResultAssert.Problem(await Create(Input(price: -1m, vat: 0)), 422, ValidationMessages.InvalidMoneyAmount);
    }

    [Fact]
    public async Task Update_applies_the_same_input_rules_before_it_looks_at_the_version()
    {
        ResultAssert.Problem(await Update(Input(key: ""), version: 0), 422, "PartNumber and Name are required.");
        ResultAssert.Problem(await Update(Input(vat: 4), version: 0), 422, ValidationMessages.InvalidVatRate);
    }

    [Fact]
    public async Task Update_without_a_version_is_422_before_any_lookup()
    {
        ResultAssert.Problem(await Update(Input(), version: 0), 422, "Version is required.");
    }
}

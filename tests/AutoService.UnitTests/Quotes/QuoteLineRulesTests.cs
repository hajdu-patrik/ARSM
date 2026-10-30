using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Quotes;
using AutoService.ApiService.Validation;
using AutoService.UnitTests.Http;
using Microsoft.AspNetCore.Http;

namespace AutoService.UnitTests.Quotes;

/** Line request checks that run before any database access: kind, quantity, kind integrity and snapshot bounds. */
public sealed class QuoteLineRulesTests
{
    private static IResult? Basics(string kind, decimal quantity, out QuoteLineKind lineKind)
    {
        object?[] args = [kind, quantity, null];
        var result = (IResult?)PrivateStatic.Run(typeof(QuoteEndpoints), "TryParseLineRequestBasics", args);
        lineKind = (QuoteLineKind)args[2]!;
        return result;
    }

    private static IResult? Integrity(QuoteLineKind kind, int? partId, int? laborTypeId) =>
        PrivateStatic.Call<IResult?>(typeof(QuoteEndpoints), "GetLineKindIntegrityError", kind, partId, laborTypeId);

    private static IResult? SnapshotError(string description, decimal price, int vat) =>
        PrivateStatic.Call<IResult?>(typeof(QuoteEndpoints), "GetLineSnapshotFieldError", description, price, vat);

    [Theory]
    [InlineData("Part", QuoteLineKind.Part)]
    [InlineData("labor", QuoteLineKind.Labor)]
    [InlineData("LABOR", QuoteLineKind.Labor)]
    public void TryParseLineRequestBasics_accepts_a_kind_name_in_any_case(string raw, QuoteLineKind expected)
    {
        Assert.Null(Basics(raw, 1m, out var kind));
        Assert.Equal(expected, kind);
    }

    [Theory]
    [InlineData("")]
    [InlineData("Service")]
    public void TryParseLineRequestBasics_rejects_an_unknown_kind_name(string raw)
    {
        ResultAssert.Problem(Basics(raw, 1m, out _), 422, "LineKind must be one of: Part, Labor.");
    }

    [Theory]
    [InlineData("7")]
    [InlineData("-1")]
    public void TryParseLineRequestBasics_rejects_a_number_that_is_no_defined_kind(string raw)
    {
        ResultAssert.Problem(Basics(raw, 1m, out _), 422, "LineKind must be one of: Part, Labor.");
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("10000.01")]
    public void TryParseLineRequestBasics_applies_the_quantity_rule_after_the_kind(string quantity)
    {
        var parsed = decimal.Parse(quantity, System.Globalization.CultureInfo.InvariantCulture);

        ResultAssert.Problem(Basics("Part", parsed, out _), 422, ValidationMessages.InvalidQuantity);
    }

    [Fact]
    public void GetLineKindIntegrityError_accepts_matching_and_catalog_free_lines()
    {
        Assert.Null(Integrity(QuoteLineKind.Part, 4, null));
        Assert.Null(Integrity(QuoteLineKind.Labor, null, 8));
        Assert.Null(Integrity(QuoteLineKind.Part, null, null));
        Assert.Null(Integrity(QuoteLineKind.Labor, null, null));
    }

    [Fact]
    public void GetLineKindIntegrityError_refuses_a_part_line_with_a_labor_type()
    {
        ResultAssert.Problem(Integrity(QuoteLineKind.Part, null, 8), 422, "A part line cannot reference a labor type.");
        ResultAssert.Problem(Integrity(QuoteLineKind.Part, 4, 8), 422, "A part line cannot reference a labor type.");
    }

    [Fact]
    public void GetLineKindIntegrityError_refuses_a_labor_line_with_a_part()
    {
        ResultAssert.Problem(Integrity(QuoteLineKind.Labor, 4, null), 422, "A labor line cannot reference a part.");
        ResultAssert.Problem(Integrity(QuoteLineKind.Labor, 4, 8), 422, "A labor line cannot reference a part.");
    }

    [Fact]
    public void GetLineSnapshotFieldError_accepts_the_boundaries()
    {
        Assert.Null(SnapshotError(new string('d', 120), 0m, 5));
        Assert.Null(SnapshotError("d", 100_000_000m, 27));
    }

    [Fact]
    public void GetLineSnapshotFieldError_rejects_a_121_character_description()
    {
        ResultAssert.Problem(SnapshotError(new string('d', 121), 1m, 27), 422, "Description must be at most 120 characters.");
    }

    [Fact]
    public void GetLineSnapshotFieldError_rejects_a_price_outside_the_money_range()
    {
        ResultAssert.Problem(SnapshotError("d", -0.01m, 27), 422, ValidationMessages.InvalidMoneyAmount);
        ResultAssert.Problem(SnapshotError("d", 100_000_000.01m, 27), 422, ValidationMessages.InvalidMoneyAmount);
    }

    [Fact]
    public void GetLineSnapshotFieldError_rejects_a_vat_rate_outside_5_18_27()
    {
        ResultAssert.Problem(SnapshotError("d", 1m, 0), 422, ValidationMessages.InvalidVatRate);
    }

    [Fact]
    public void GetLineSnapshotFieldError_checks_description_then_price_then_vat()
    {
        ResultAssert.Problem(SnapshotError(new string('d', 121), -1m, 0), 422, "Description must be at most 120 characters.");
        ResultAssert.Problem(SnapshotError("d", -1m, 0), 422, ValidationMessages.InvalidMoneyAmount);
    }
}

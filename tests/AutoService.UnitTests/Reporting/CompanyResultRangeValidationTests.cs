using AutoService.ApiService.Reporting;
using AutoService.UnitTests.Http;
using Microsoft.AspNetCore.Http;

namespace AutoService.UnitTests.Reporting;

/** The report period is validated before any query runs; the aggregation itself is covered by the HTTP and SQL suites. */
public sealed class CompanyResultRangeValidationTests
{
    private static async Task<IResult> Report(int? year, int? month)
    {
        object?[] args = [year, month, null, CancellationToken.None];
        return await (Task<IResult>)PrivateStatic.Run(typeof(CompanyResultEndpoints), "GetCompanyResultsAsync", args)!;
    }

    [Theory]
    [InlineData(1999, null)]
    [InlineData(2101, null)]
    [InlineData(0, 6)]
    [InlineData(2026, 0)]
    [InlineData(2026, 13)]
    [InlineData(2026, -1)]
    [InlineData(null, 13)]
    [InlineData(1999, 13)]
    public async Task A_year_outside_2000_to_2100_or_a_month_outside_1_to_12_is_a_400_with_a_stable_code(int? year, int? month)
    {
        var result = await Report(year, month);

        Assert.Equal(400, ResultAssert.StatusOf(result));
        Assert.Equal("invalid_date_range", ResultAssert.CodeOf(result));
    }

    [Fact]
    public async Task The_400_body_states_the_allowed_ranges()
    {
        var result = await Report(1999, null);

        var body = ((IValueHttpResult)result).Value!;
        var message = (string?)body.GetType().GetProperty("error")!.GetValue(body);
        Assert.Equal("Year must be 2000-2100, month must be 1-12.", message);
    }
}

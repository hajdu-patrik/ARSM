using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Quotes;
using AutoService.UnitTests.Http;
using Microsoft.AspNetCore.Http;

namespace AutoService.UnitTests.Quotes;

/** The quote lock answers that need no database: no appointment, and a completed or cancelled one. */
public sealed class QuoteLockingTests
{
    private static async Task<T> Run<T>(string method, params object?[] leading)
    {
        object?[] args = [.. leading, null, CancellationToken.None];
        return await (Task<T>)PrivateStatic.Run(typeof(QuoteEndpoints), method, args)!;
    }

    [Fact]
    public async Task A_quote_without_an_appointment_is_never_locked()
    {
        var quote = QuoteFixtures.NewQuote(QuoteStatus.Accepted);

        Assert.Null(await Run<string?>("ResolveQuoteLockReasonAsync", quote));
        Assert.Null(await Run<IResult?>("CheckQuoteLockAsync", quote));
    }

    [Theory]
    [InlineData(ProgressStatus.Completed, "appointment_completed", "quote_locked_appointment_completed")]
    [InlineData(ProgressStatus.Cancelled, "appointment_cancelled", "quote_locked_appointment_cancelled")]
    public async Task A_closed_appointment_locks_its_quote_with_the_matching_reason_and_409_code(
        ProgressStatus status, string reason, string code)
    {
        var quote = QuoteFixtures.NewQuote(QuoteStatus.Draft, appointment: QuoteFixtures.NewAppointment(status));

        Assert.Equal(reason, await Run<string?>("ResolveQuoteLockReasonAsync", quote));

        var lockResult = await Run<IResult?>("CheckQuoteLockAsync", quote);
        Assert.Equal(409, ResultAssert.StatusOf(lockResult));
        Assert.Equal(code, ResultAssert.CodeOf(lockResult));
    }

    [Theory]
    [InlineData(ProgressStatus.Completed, "appointment_completed")]
    [InlineData(ProgressStatus.Cancelled, "appointment_cancelled")]
    public async Task The_appointment_lookup_skips_the_sibling_query_for_a_closed_appointment(ProgressStatus status, string reason)
    {
        var result = await Run<string?>("ResolveAppointmentLockReasonAsync", 11, status);

        Assert.Equal(reason, result);
    }
}

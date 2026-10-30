using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Http;
using AutoService.ApiService.Quotes;
using AutoService.UnitTests.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoService.UnitTests.Quotes;

/** The quote status machine: Draft to Sent, Sent to Accepted or Rejected, nothing else; stamps follow the move. */
public sealed class QuoteStatusTransitionTests
{
    private static bool Allowed(QuoteStatus source, QuoteStatus target) =>
        PrivateStatic.Call<bool>(typeof(QuoteEndpoints), "IsAllowedQuoteStatusTransition", source, target);

    [Theory]
    [InlineData(QuoteStatus.Draft, QuoteStatus.Sent)]
    [InlineData(QuoteStatus.Sent, QuoteStatus.Accepted)]
    [InlineData(QuoteStatus.Sent, QuoteStatus.Rejected)]
    public void The_three_forward_moves_are_allowed(QuoteStatus source, QuoteStatus target)
    {
        Assert.True(Allowed(source, target));
    }

    [Fact]
    public void Every_other_pair_is_refused_including_same_status_back_moves_and_terminal_exits()
    {
        var allowed = new HashSet<(QuoteStatus, QuoteStatus)>
        {
            (QuoteStatus.Draft, QuoteStatus.Sent),
            (QuoteStatus.Sent, QuoteStatus.Accepted),
            (QuoteStatus.Sent, QuoteStatus.Rejected),
        };

        foreach (var source in Enum.GetValues<QuoteStatus>())
        {
            foreach (var target in Enum.GetValues<QuoteStatus>())
            {
                Assert.Equal(allowed.Contains((source, target)), Allowed(source, target));
            }
        }
    }

    [Fact]
    public void Sending_stamps_SentAt_and_leaves_DecidedAt_alone()
    {
        var quote = QuoteFixtures.NewQuote();
        var before = DateTime.UtcNow;

        PrivateStatic.Run(typeof(QuoteEndpoints), "ApplyQuoteStatusTransition", [quote, QuoteStatus.Sent]);

        Assert.Equal(QuoteStatus.Sent, quote.Status);
        Assert.InRange(quote.SentAt!.Value, before, DateTime.UtcNow);
        Assert.Null(quote.DecidedAt);
    }

    [Theory]
    [InlineData(QuoteStatus.Accepted)]
    [InlineData(QuoteStatus.Rejected)]
    public void Deciding_stamps_DecidedAt_and_keeps_SentAt(QuoteStatus decision)
    {
        var quote = QuoteFixtures.NewQuote(QuoteStatus.Sent);
        var sentAt = QuoteFixtures.Now.AddHours(-3);
        quote.SentAt = sentAt;
        var before = DateTime.UtcNow;

        PrivateStatic.Run(typeof(QuoteEndpoints), "ApplyQuoteStatusTransition", [quote, decision]);

        Assert.Equal(decision, quote.Status);
        Assert.InRange(quote.DecidedAt!.Value, before, DateTime.UtcNow);
        Assert.Equal(sentAt, quote.SentAt);
    }

    [Fact]
    public void ConflictWithCode_answers_409_with_the_code_body()
    {
        var result = PrivateStatic.Call<Microsoft.AspNetCore.Http.IResult>(typeof(QuoteEndpoints), "ConflictWithCode", "quote_email_failed");

        var json = Assert.IsType<JsonHttpResult<ErrorCodeResponse>>(result);
        Assert.Equal(409, json.StatusCode);
        Assert.Equal("quote_email_failed", json.Value!.Code);
    }

    [Fact]
    public async Task A_numeric_status_is_rejected_like_an_unknown_name_before_any_lookup()
    {
        // Enum.TryParse takes "7" as an undefined QuoteStatus; the request should be a 422 like any unknown name.
        object?[] args = [1, new QuoteEndpoints.ChangeQuoteStatusRequest("7", 1), null, null, null, NullLoggerFactory.Instance, null, null, CancellationToken.None];

        var result = await (Task<Microsoft.AspNetCore.Http.IResult>)PrivateStatic.Run(typeof(QuoteEndpoints), "ChangeQuoteStatusAsync", args)!;

        Assert.Equal(422, ResultAssert.StatusOf(result));
    }

    [Fact]
    public async Task An_unknown_status_name_is_a_422_before_any_lookup()
    {
        object?[] args = [1, new QuoteEndpoints.ChangeQuoteStatusRequest("Archived", 1), null, null, null, NullLoggerFactory.Instance, null, null, CancellationToken.None];

        var result = await (Task<Microsoft.AspNetCore.Http.IResult>)PrivateStatic.Run(typeof(QuoteEndpoints), "ChangeQuoteStatusAsync", args)!;

        ResultAssert.Problem(result, 422, "Status must be one of: Draft, Sent, Accepted, Rejected.");
    }
}

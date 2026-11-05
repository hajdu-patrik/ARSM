using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Quotes;
using AutoService.UnitTests.Http;
using Microsoft.AspNetCore.Http;

namespace AutoService.UnitTests.Quotes;

/** The Draft->Sent checks after the transition and version checks, in contract order (L10, K10). */
public sealed class QuoteSendPreconditionTests
{
    private static Quote SendableQuote(DateTime? validUntil = null)
    {
        var quote = QuoteFixtures.NewQuote(validUntil: validUntil);
        quote.Lines.Add(QuoteFixtures.NewLine(QuoteLineKind.Part, "Szűrő", 1m, 1000m, 27, 1));
        return quote;
    }

    private static IResult? Check(Quote quote, uint version = 0) =>
        PrivateStatic.Call<IResult?>(typeof(QuoteEndpoints), "GetSendPreconditionError", quote, version, QuoteFixtures.Now);

    private static void AssertCode(IResult? result, int status, string code)
    {
        Assert.Equal(status, ResultAssert.StatusOf(result));
        Assert.Equal(code, ResultAssert.CodeOf(result));
    }

    [Fact]
    public void A_quote_with_lines_a_future_validity_the_current_version_and_an_address_may_be_sent()
    {
        Assert.Null(Check(SendableQuote()));
    }

    [Fact]
    public void A_quote_without_lines_is_409_with_the_detail()
    {
        ResultAssert.Problem(Check(QuoteFixtures.NewQuote()), 409, "A quote must have at least one line before it can be sent.");
    }

    [Fact]
    public void A_validity_date_in_the_past_is_422_quote_valid_until_passed_and_the_current_instant_still_passes()
    {
        AssertCode(Check(SendableQuote(QuoteFixtures.Now.AddSeconds(-1))), 422, "quote_valid_until_passed");
        Assert.Null(Check(SendableQuote(QuoteFixtures.Now)));
    }

    [Fact]
    public void A_stale_version_is_409_quote_version_conflict()
    {
        AssertCode(Check(SendableQuote(), version: 4), 409, "quote_version_conflict");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("mechanic-owner-5@customers.arsm.local")]
    [InlineData("x@Shop.LOCAL")]
    public void An_address_that_cannot_receive_mail_is_422_quote_customer_email_missing(string email)
    {
        var quote = SendableQuote();
        quote.Vehicle.Customer.Email = email;

        AssertCode(Check(quote), 422, "quote_customer_email_missing");
    }

    [Fact]
    public void The_checks_run_in_order_lines_then_validity_then_version_then_address()
    {
        var quote = QuoteFixtures.NewQuote(validUntil: QuoteFixtures.Now.AddDays(-1));
        quote.Vehicle.Customer.Email = "";
        ResultAssert.Problem(Check(quote, version: 4), 409, "A quote must have at least one line before it can be sent.");

        quote.Lines.Add(QuoteFixtures.NewLine(QuoteLineKind.Part, "Szűrő", 1m, 1000m, 27, 1));
        AssertCode(Check(quote, version: 4), 422, "quote_valid_until_passed");

        quote.ValidUntil = QuoteFixtures.Now.AddDays(1);
        AssertCode(Check(quote, version: 4), 409, "quote_version_conflict");
        AssertCode(Check(quote), 422, "quote_customer_email_missing");
    }
}

using AutoService.ApiService.Quotes;

namespace AutoService.UnitTests.Quotes;

/** A blank address and a `.local` domain (the synthetic mechanic-owner address too) cannot receive the quote mail. */
public sealed class QuoteRecipientRulesTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("mechanic-owner-5@customers.arsm.local")]
    [InlineData("x@Shop.LOCAL")]
    [InlineData("  x@shop.local  ")]
    public void HasDeliverableAddress_is_false_for_a_blank_or_dot_local_address(string? email)
    {
        Assert.False(QuoteRecipientRules.HasDeliverableAddress(email));
    }

    [Theory]
    [InlineData("anna@example.com")]
    [InlineData("  anna@example.com  ")]
    [InlineData("anna@localhost.example.hu")]
    [InlineData("local@example.test")]
    public void HasDeliverableAddress_is_true_for_a_normal_address(string email)
    {
        Assert.True(QuoteRecipientRules.HasDeliverableAddress(email));
    }
}

using AutoService.ApiService.Email.Sending;

namespace AutoService.UnitTests.Email;

/** Reserved RFC 2606/6761 domains are recognised, real ones are not (the sender-level skip is in AzureCommunicationEmailSenderTests). */
public sealed class ReservedMailDomainsTests
{
    [Theory]
    [InlineData("example.test")]
    [InlineData("customers.example")]
    [InlineData("nowhere.invalid")]
    [InlineData("localhost")]
    [InlineData("app.localhost")]
    [InlineData("example.com")]
    [InlineData("mail.example.org")]
    [InlineData("EXAMPLE.NET")]
    [InlineData("example.test.")]
    public void IsReserved_is_true_for_reserved_domains(string domain)
    {
        Assert.True(ReservedMailDomains.IsReserved(domain));
    }

    [Theory]
    [InlineData("arsm.hu")]
    [InlineData("gmail.com")]
    [InlineData("myexample.com")]
    [InlineData("example.hu")]
    [InlineData("testing.io")]
    public void IsReserved_is_false_for_real_domains(string domain)
    {
        Assert.False(ReservedMailDomains.IsReserved(domain));
    }
}

using AutoService.ApiService.Configuration;

namespace AutoService.ApiService.Email.Templates;

/** Workshop contact block printed under every mail. */
internal sealed record EmailFooter(string CompanyName, string AddressLine, string Phone, string ReplyTo)
{
    internal static EmailFooter From(CompanyProfile company, string replyTo) =>
        new(company.Name, $"{company.PostalCode} {company.City}, {company.AddressLine}", company.PhoneNumber, replyTo);
}

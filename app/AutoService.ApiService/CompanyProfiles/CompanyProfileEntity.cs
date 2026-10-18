using AutoService.ApiService.Configuration;

namespace AutoService.ApiService.CompanyProfiles;

/** Single-row table holding the workshop letterhead printed on the quote PDF (D18); the row id is always 1. */
public sealed class CompanyProfileEntity
{
    public const int SingletonId = 1;

    public int Id { get; set; } = SingletonId;
    public string Name { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string TaxNumber { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    /** Copies the values of the PDF value record onto this row. */
    public void Apply(CompanyProfile profile)
    {
        Name = profile.Name;
        AddressLine = profile.AddressLine;
        PostalCode = profile.PostalCode;
        City = profile.City;
        TaxNumber = profile.TaxNumber;
        PhoneNumber = profile.PhoneNumber;
        Email = profile.Email;
    }

    /** Projects the row into the immutable record the PDF renderer consumes. */
    public CompanyProfile ToProfile() => new(Name, AddressLine, PostalCode, City, TaxNumber, PhoneNumber, Email);
}

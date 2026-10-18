namespace AutoService.ApiService.CompanyProfiles;

public static partial class CompanyProfileEndpoints
{
    /** Request and response body of the company profile endpoints. */
    internal sealed record CompanyProfileDto(
        string Name,
        string AddressLine,
        string PostalCode,
        string City,
        string TaxNumber,
        string PhoneNumber,
        string Email);
}

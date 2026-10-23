using AutoService.ApiService.Configuration;

namespace AutoService.ApiService.CompanyProfiles;

/** Maps a company profile to the ARSM_COMPANY_* keys of the repository .env file. */
internal static class CompanyProfileEnvValues
{
    public static IReadOnlyDictionary<string, string> From(CompanyProfile profile) => new Dictionary<string, string>
    {
        ["ARSM_COMPANY_NAME"] = profile.Name,
        ["ARSM_COMPANY_ADDRESS_LINE"] = profile.AddressLine,
        ["ARSM_COMPANY_POSTAL_CODE"] = profile.PostalCode,
        ["ARSM_COMPANY_CITY"] = profile.City,
        ["ARSM_COMPANY_TAX_NUMBER"] = profile.TaxNumber,
        ["ARSM_COMPANY_PHONE"] = profile.PhoneNumber,
        ["ARSM_COMPANY_EMAIL"] = profile.Email,
    };
}

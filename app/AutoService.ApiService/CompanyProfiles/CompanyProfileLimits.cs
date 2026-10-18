namespace AutoService.ApiService.CompanyProfiles;

/** Field length caps shared by the column mapping, the validator and the WebUI mirror. */
public static class CompanyProfileLimits
{
    public const int NameMaxLength = 150;
    public const int AddressLineMaxLength = 150;
    public const int PostalCodeLength = 4;
    public const int CityMaxLength = 50;
    public const int TaxNumberLength = 13;
    public const int PhoneNumberMaxLength = 20;
    public const int EmailMaxLength = 150;
}

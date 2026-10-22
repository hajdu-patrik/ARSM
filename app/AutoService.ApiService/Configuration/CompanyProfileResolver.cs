namespace AutoService.ApiService.Configuration;

/** Service company identity printed on the quote PDF header (D18). Stored in the single-row company profile table. */
public sealed record CompanyProfile(
    string Name,
    string AddressLine,
    string PostalCode,
    string City,
    string TaxNumber,
    string PhoneNumber,
    string Email);

/** Resolves the one-time seed from config, preferring 'CompanyProfile__*' environment variables; throws at
    startup (D26) on a missing field or template placeholder when the table is empty. */
public static class CompanyProfileResolver
{
    private const string SectionName = "CompanyProfile";

    public static CompanyProfile Resolve(IConfiguration configuration)
    {
        var section = configuration.GetSection(SectionName);

        return new CompanyProfile(
            ResolveField(section, nameof(CompanyProfile.Name)),
            ResolveField(section, nameof(CompanyProfile.AddressLine)),
            ResolveField(section, nameof(CompanyProfile.PostalCode)),
            ResolveField(section, nameof(CompanyProfile.City)),
            ResolveField(section, nameof(CompanyProfile.TaxNumber)),
            ResolveField(section, nameof(CompanyProfile.PhoneNumber)),
            ResolveField(section, nameof(CompanyProfile.Email)));
    }

    /** Reads one field and rejects a missing value or a template placeholder. */
    private static string ResolveField(IConfigurationSection section, string fieldName)
    {
        var fromEnvironment = Environment.GetEnvironmentVariable($"{SectionName}__{fieldName}");
        var value = string.IsNullOrWhiteSpace(fromEnvironment) ? section[fieldName] : fromEnvironment;

        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException(
                $"Company profile field '{SectionName}:{fieldName}' is missing. Fill the whole {SectionName} section in appsettings.Local.json (see appsettings.Local.template.json) or set the '{SectionName}__{fieldName}' environment variable. The quote PDF header cannot be printed without it.");
        }

        if (TemplateMarkerDetector.ContainsTemplateMarker(value))
        {
            throw new InvalidOperationException(
                $"Company profile field '{SectionName}:{fieldName}' still contains a template placeholder marker (for example CHANGE_ME). Replace it with the real workshop data before startup.");
        }

        return value.Trim();
    }
}

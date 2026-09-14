namespace AutoService.ApiService.Configuration;

/**
 * Service company identity printed on the quote PDF header (D18).
 * One workshop per deployment, so this is configuration rather than a table.
 */
public sealed record CompanyProfile(
    string Name,
    string AddressLine,
    string PostalCode,
    string City,
    string TaxNumber,
    string PhoneNumber,
    string Email);

/**
 * Resolves the company profile from configuration, preferring the
 * 'CompanyProfile__*' environment variables the way the connection string and
 * the JWT secret do. Throws at startup when a field is missing or still holds
 * a template placeholder (D26): a quote that goes to a customer must not be
 * printed with a half-empty letterhead, and failing at startup is the only
 * moment where that is cheap to notice.
 */
public static class CompanyProfileResolver
{
    private const string SectionName = "CompanyProfile";

    /**
     * Resolves and validates every company profile field.
     *
     * @param configuration Application configuration, environment variables included.
     * @return The validated company profile.
     */
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

    /**
     * Reads one field and rejects a missing value or a template placeholder.
     *
     * @param section The CompanyProfile configuration section.
     * @param fieldName Field to read.
     * @return The validated field value.
     */
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

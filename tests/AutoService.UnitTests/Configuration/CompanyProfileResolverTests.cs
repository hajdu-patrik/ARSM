using AutoService.ApiService.Configuration;
using Microsoft.Extensions.Configuration;

namespace AutoService.UnitTests.Configuration;

/** The letterhead seed: every field required, environment per field over config, placeholders refused. */
[Collection(ProcessEnvironmentCollection.Name)]
public sealed class CompanyProfileResolverTests : IDisposable
{
    private static readonly string[] Fields = ["Name", "AddressLine", "PostalCode", "City", "TaxNumber", "PhoneNumber", "Email"];

    private readonly ProcessEnvironmentScope environment = new(Fields.Select(field => $"CompanyProfile__{field}").ToArray());

    public void Dispose() => environment.Dispose();

    private static Dictionary<string, string?> Full() => new()
    {
        ["CompanyProfile:Name"] = "Test Kft.",
        ["CompanyProfile:AddressLine"] = "Fo utca 1.",
        ["CompanyProfile:PostalCode"] = "1111",
        ["CompanyProfile:City"] = "Budapest",
        ["CompanyProfile:TaxNumber"] = "11111111-1-11",
        ["CompanyProfile:PhoneNumber"] = "+36 1 111 1111",
        ["CompanyProfile:Email"] = "info@example.test",
    };

    private static IConfiguration Config(Dictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values).Build();

    [Fact]
    public void All_seven_fields_are_read_from_configuration()
    {
        var profile = CompanyProfileResolver.Resolve(Config(Full()));

        Assert.Equal(
            new CompanyProfile("Test Kft.", "Fo utca 1.", "1111", "Budapest", "11111111-1-11", "+36 1 111 1111", "info@example.test"),
            profile);
    }

    [Fact]
    public void Values_are_trimmed()
    {
        var values = Full();
        values["CompanyProfile:City"] = "  Budapest  ";

        Assert.Equal("Budapest", CompanyProfileResolver.Resolve(Config(values)).City);
    }

    [Fact]
    public void An_environment_value_wins_for_its_own_field_only()
    {
        environment.Set("CompanyProfile__City", "Gyor");

        var profile = CompanyProfileResolver.Resolve(Config(Full()));

        Assert.Equal("Gyor", profile.City);
        Assert.Equal("Test Kft.", profile.Name);
    }

    [Fact]
    public void A_blank_environment_value_falls_back_to_configuration()
    {
        environment.Set("CompanyProfile__City", "  ");

        Assert.Equal("Budapest", CompanyProfileResolver.Resolve(Config(Full())).City);
    }

    [Theory]
    [InlineData("Name")]
    [InlineData("AddressLine")]
    [InlineData("PostalCode")]
    [InlineData("City")]
    [InlineData("TaxNumber")]
    [InlineData("PhoneNumber")]
    [InlineData("Email")]
    public void A_missing_or_blank_field_fails_startup_naming_it(string field)
    {
        foreach (var value in new string?[] { null, "  " })
        {
            var values = Full();
            values[$"CompanyProfile:{field}"] = value;

            var exception = Assert.Throws<InvalidOperationException>(() => CompanyProfileResolver.Resolve(Config(values)));

            Assert.Contains($"'CompanyProfile:{field}' is missing", exception.Message);
        }
    }

    [Fact]
    public void A_placeholder_value_fails_startup_naming_the_field()
    {
        var values = Full();
        values["CompanyProfile:Email"] = "CHANGE_ME_EMAIL";

        var exception = Assert.Throws<InvalidOperationException>(() => CompanyProfileResolver.Resolve(Config(values)));

        Assert.Contains("'CompanyProfile:Email' still contains a template placeholder marker", exception.Message);
    }
}

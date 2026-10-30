using AutoService.ApiService.CompanyProfiles;
using AutoService.ApiService.Configuration;

namespace AutoService.UnitTests.CompanyProfiles;

/** The profile entity round-trips the seven letterhead fields, and each field lands on its own .env key. */
public sealed class CompanyProfileMappingTests
{
    private static readonly CompanyProfile Profile =
        new("Test Kft.", "Fo utca 1.", "1111", "Budapest", "22222222-2-22", "+36304445566", "info@example.test");

    [Fact]
    public void The_singleton_row_id_is_one()
    {
        Assert.Equal(1, CompanyProfileEntity.SingletonId);
        Assert.Equal(1, new CompanyProfileEntity().Id);
    }

    [Fact]
    public void Apply_then_ToProfile_round_trips_every_field()
    {
        var row = new CompanyProfileEntity();

        row.Apply(Profile);

        Assert.Equal(Profile, row.ToProfile());
        Assert.Equal("22222222-2-22", row.TaxNumber);
        Assert.Equal("+36304445566", row.PhoneNumber);
    }

    [Fact]
    public void Apply_overwrites_what_the_row_held_before()
    {
        var row = new CompanyProfileEntity();
        row.Apply(Profile);

        row.Apply(Profile with { City = "Gyor", Email = "other@example.test" });

        Assert.Equal("Gyor", row.City);
        Assert.Equal("other@example.test", row.Email);
        Assert.Equal("Test Kft.", row.Name);
    }

    [Fact]
    public void Each_field_maps_to_its_own_env_key()
    {
        var values = CompanyProfileEnvValues.From(Profile);

        Assert.Equal(7, values.Count);
        Assert.Equal("Test Kft.", values["ARSM_COMPANY_NAME"]);
        Assert.Equal("Fo utca 1.", values["ARSM_COMPANY_ADDRESS_LINE"]);
        Assert.Equal("1111", values["ARSM_COMPANY_POSTAL_CODE"]);
        Assert.Equal("Budapest", values["ARSM_COMPANY_CITY"]);
        Assert.Equal("22222222-2-22", values["ARSM_COMPANY_TAX_NUMBER"]);
        Assert.Equal("+36304445566", values["ARSM_COMPANY_PHONE"]);
        Assert.Equal("info@example.test", values["ARSM_COMPANY_EMAIL"]);
    }
}

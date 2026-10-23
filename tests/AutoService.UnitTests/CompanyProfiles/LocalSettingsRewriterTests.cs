using System.Text.Json;
using AutoService.ApiService.CompanyProfiles;
using AutoService.ApiService.Configuration;

namespace AutoService.UnitTests.CompanyProfiles;

/** The appsettings.Local.json write-back swaps only the CompanyProfile values and keeps the file layout. */
public sealed class LocalSettingsRewriterTests
{
    private static readonly CompanyProfile Profile =
        new("New \"Kft.\"", "Fő utca 2.", "2222", "Győr", "11111111-1-11", "+36 1 111 1111", "new@example.com");

    private static readonly string Json = """
        {
          "Logging": { "Name": "keep" },
          "CompanyProfile": {
            "Name": "Old",
            "AddressLine": "Old",
            "PostalCode": "1111",
            "City": "Old",
            "TaxNumber": "00000000-0-00",
            "PhoneNumber": "Old",
            "Email": "old@example.com"
          },
          "Other": { "City": "keep" }
        }
        """.ReplaceLineEndings("\n");

    [Fact]
    public void Rewrite_updates_the_seven_section_values()
    {
        var section = JsonDocument.Parse(LocalSettingsRewriter.Rewrite(Json, Profile)).RootElement.GetProperty("CompanyProfile");

        Assert.Equal("New \"Kft.\"", section.GetProperty("Name").GetString());
        Assert.Equal("Fő utca 2.", section.GetProperty("AddressLine").GetString());
        Assert.Equal("2222", section.GetProperty("PostalCode").GetString());
        Assert.Equal("Győr", section.GetProperty("City").GetString());
        Assert.Equal("11111111-1-11", section.GetProperty("TaxNumber").GetString());
        Assert.Equal("+36 1 111 1111", section.GetProperty("PhoneNumber").GetString());
        Assert.Equal("new@example.com", section.GetProperty("Email").GetString());
    }

    [Fact]
    public void Rewrite_keeps_other_sections_and_the_layout_identical()
    {
        var result = LocalSettingsRewriter.Rewrite(Json, Profile);

        Assert.Contains("\"Logging\": { \"Name\": \"keep\" },", result);
        Assert.Contains("\"Other\": { \"City\": \"keep\" }", result);
        Assert.Contains("\n    \"PostalCode\": \"2222\",\n", result);
        Assert.Equal(Json.Split('\n').Length, result.Split('\n').Length);
    }

    [Fact]
    public void Rewrite_preserves_crlf_and_tab_indentation()
    {
        var json = "{\r\n\t\"CompanyProfile\": {\r\n\t\t\"Name\": \"Old\"\r\n\t}\r\n}";

        var result = LocalSettingsRewriter.Rewrite(json, Profile with { Name = "New Kft." });

        Assert.Equal("{\r\n\t\"CompanyProfile\": {\r\n\t\t\"Name\": \"New Kft.\"\r\n\t}\r\n}", result);
    }

    [Fact]
    public void Rewrite_returns_the_input_when_the_section_is_missing()
    {
        const string json = "{\n  \"Logging\": {}\n}";

        Assert.Equal(json, LocalSettingsRewriter.Rewrite(json, Profile));
    }
}

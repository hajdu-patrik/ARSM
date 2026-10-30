using AutoService.ApiService.DataInitialization;
using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.UnitTests.Data;

/** The first-admin bootstrap applies the mechanic registration rules and reports field names only, never values. */
public sealed class AdminBootstrapSettingsTests
{
    private static AdminBootstrapSettings Valid() => new()
    {
        Email = "Admin@Example.Test",
        Password = "Str0ng-Passw0rd!",
        FirstName = "Anna",
        MiddleName = "Maria",
        LastName = "Nagy",
        PhoneNumber = "+36 30 444 5566",
        Specialization = "all",
        Expertise = ["Engine", "brakes"],
    };

    private static List<string> Errors(Action<AdminBootstrapSettings> change)
    {
        var settings = Valid();
        change(settings);
        var errors = settings.Validate(out var request);

        Assert.Null(request);
        return errors;
    }

    [Fact]
    public void A_complete_configuration_yields_a_normalized_request_and_no_errors()
    {
        var errors = Valid().Validate(out var request);

        Assert.Empty(errors);
        Assert.NotNull(request);
        Assert.Equal("Anna Maria Nagy", request.Name.ToString());
        Assert.Equal("admin@example.test", request.Email);
        Assert.Equal("+36304445566", request.PhoneNumber);
        Assert.Equal("Str0ng-Passw0rd!", request.Password);
        Assert.Equal(SpecializationType.All, request.Specialization);
        Assert.Equal(new[] { ExpertiseType.Engine, ExpertiseType.Brakes }, request.Expertise);
    }

    [Fact]
    public void Names_are_trimmed_and_a_blank_middle_name_and_phone_are_optional()
    {
        var settings = Valid();
        settings.FirstName = "  Anna ";
        settings.MiddleName = "  ";
        settings.PhoneNumber = "";

        var errors = settings.Validate(out var request);

        Assert.Empty(errors);
        Assert.Equal("Anna Nagy", request!.Name.ToString());
        Assert.Null(request.PhoneNumber);
    }

    [Theory]
    [InlineData("FirstName")]
    [InlineData("LastName")]
    [InlineData("Password")]
    [InlineData("Email")]
    public void A_missing_required_field_is_reported_by_name(string field)
    {
        var errors = Errors(settings => typeof(AdminBootstrapSettings).GetProperty(field)!.SetValue(settings, null));

        Assert.Contains(field, errors);
    }

    [Fact]
    public void A_blank_first_name_is_reported_as_missing()
    {
        Assert.Contains("FirstName", Errors(settings => settings.FirstName = "   "));
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("a@b@c.test")]
    [InlineData("Name <admin@example.test>")]
    public void An_invalid_email_is_reported(string email)
    {
        Assert.Equal(new[] { "Email" }, Errors(settings => settings.Email = email));
    }

    [Fact]
    public void The_name_parts_accept_letters_and_hyphens_only()
    {
        Assert.Equal(new[] { "FirstName" }, Errors(settings => settings.FirstName = "Anna1"));
        Assert.Equal(new[] { "LastName" }, Errors(settings => settings.LastName = "Nagy_"));
        Assert.Equal(new[] { "MiddleName" }, Errors(settings => settings.MiddleName = "M4"));
    }

    [Theory]
    [InlineData("123")]
    [InlineData("+1 202 555 0143")]
    [InlineData("not a phone")]
    public void A_given_phone_must_be_a_valid_european_number(string phone)
    {
        Assert.Equal(new[] { "PhoneNumber" }, Errors(settings => settings.PhoneNumber = phone));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("nope")]
    [InlineData("99")]
    public void A_missing_or_unknown_specialization_is_reported(string? specialization)
    {
        Assert.Equal(new[] { "Specialization" }, Errors(settings => settings.Specialization = specialization));
    }

    [Fact]
    public void The_specialization_is_matched_ignoring_case_and_spaces()
    {
        var settings = Valid();
        settings.Specialization = " hybridandelectric ";

        Assert.Empty(settings.Validate(out var request));
        Assert.Equal(SpecializationType.HybridAndElectric, request!.Specialization);
    }

    public static TheoryData<string[]> BadExpertise => new()
    {
        Array.Empty<string>(),
        new[] { "", "  " },
        new[] { "Nope" },
        new[] { "Engine", "engine" },
        new[] { "Engine", "Brakes", "Nope" },
    };

    [Theory]
    [MemberData(nameof(BadExpertise))]
    public void An_empty_invalid_or_duplicate_expertise_list_is_reported(string[] expertise)
    {
        Assert.Equal(new[] { "Expertise" }, Errors(settings => settings.Expertise = expertise));
    }

    [Fact]
    public void A_missing_expertise_list_is_reported_and_all_ten_areas_are_accepted()
    {
        Assert.Equal(new[] { "Expertise" }, Errors(settings => settings.Expertise = null));

        var settings = Valid();
        settings.Expertise = Enum.GetNames<ExpertiseType>();
        Assert.Empty(settings.Validate(out var request));
        Assert.Equal(10, request!.Expertise.Count);
    }

    [Fact]
    public void Blank_expertise_entries_are_ignored()
    {
        var settings = Valid();
        settings.Expertise = ["", "Engine", "  "];

        Assert.Empty(settings.Validate(out var request));
        Assert.Equal(new[] { ExpertiseType.Engine }, request!.Expertise);
    }

    [Fact]
    public void A_placeholder_password_is_reported()
    {
        Assert.Equal(new[] { "Password" }, Errors(settings => settings.Password = "CHANGE_ME_admin_password"));
    }

    [Fact]
    public void Over_long_fields_are_reported_at_the_database_and_password_caps()
    {
        Assert.Equal(new[] { "FirstName" }, Errors(settings => settings.FirstName = new string('A', 51)));
        Assert.Equal(new[] { "Password" }, Errors(settings => settings.Password = new string('p', 129)));
        Assert.Contains("Email", Errors(settings => settings.Email = new string('a', 150) + "@example.test"));
    }

    [Fact]
    public void Several_problems_are_all_reported_in_one_pass()
    {
        var errors = Errors(settings =>
        {
            settings.Email = "bad";
            settings.Specialization = "nope";
            settings.Expertise = [];
        });

        Assert.Equal(new[] { "Email", "Expertise", "Specialization" }, errors.Order());
    }
}

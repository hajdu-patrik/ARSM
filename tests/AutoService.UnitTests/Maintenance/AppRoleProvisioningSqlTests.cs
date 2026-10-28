using AutoService.ApiService.Maintenance;
using Npgsql;

namespace AutoService.UnitTests.Maintenance;

/** Pins the arsm_app grants, the identifier quoting, the password handling and the command switch. */
public sealed class AppRoleProvisioningSqlTests
{
    private const string SamplePassword = "S3cret'pa\"ss;word";

    [Fact]
    public void BuildGrantStatements_GrantsExactlyTheDmlPrivileges()
    {
        string[] expected =
        [
            "GRANT CONNECT ON DATABASE \"AutoServiceDb\" TO arsm_app",
            "GRANT USAGE ON SCHEMA public TO arsm_app",
            "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO arsm_app",
            "GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO arsm_app",
            "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arsm_app",
            "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO arsm_app",
        ];

        Assert.Equal(expected, AppRoleProvisioningSql.BuildGrantStatements("AutoServiceDb"));
    }

    [Fact]
    public void BuildGrantStatements_NeverGrantsDdlOrOwnership()
    {
        var statements = string.Join("\n", AppRoleProvisioningSql.BuildGrantStatements("AutoServiceDb"));

        Assert.DoesNotContain("CREATE", statements, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("ALL PRIVILEGES", statements, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("TRUNCATE", statements, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("WITH GRANT OPTION", statements, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void QuoteIdentifier_DoublesEmbeddedDoubleQuotes()
    {
        Assert.Equal("\"Auto\"\"; DROP ROLE x; --\"", AppRoleProvisioningSql.QuoteIdentifier("Auto\"; DROP ROLE x; --"));
        Assert.Equal(
            "GRANT CONNECT ON DATABASE \"my\"\"db\" TO arsm_app",
            AppRoleProvisioningSql.BuildGrantStatements("my\"db")[0]);
    }

    [Theory]
    [InlineData("")]
    [InlineData("bad\0name")]
    public void QuoteIdentifier_RejectsEmptyOrNulIdentifiers(string identifier)
    {
        Assert.Throws<ArgumentException>(() => AppRoleProvisioningSql.QuoteIdentifier(identifier));
    }

    [Fact]
    public void BuildCommands_BindsThePasswordAndNeverPutsItInCommandText()
    {
        var commands = AppRoleProvisioningSql.BuildCommands("AutoServiceDb", SamplePassword);

        try
        {
            Assert.All(commands, command => Assert.DoesNotContain(SamplePassword, command.CommandText, StringComparison.Ordinal));

            var bound = Assert.Single(commands, command => command.Parameters.Count > 0);
            var parameter = Assert.Single(bound.Parameters.Cast<NpgsqlParameter>());
            Assert.Equal(AppRoleProvisioningSql.PasswordParameterName, parameter.ParameterName);
            Assert.Equal(SamplePassword, parameter.Value);
            Assert.Same(bound, commands[0]);
        }
        finally
        {
            foreach (var command in commands)
            {
                command.Dispose();
            }
        }
    }

    [Fact]
    public void BuildCommands_UpsertsTheRoleBeforeTheGrants()
    {
        var commands = AppRoleProvisioningSql.BuildCommands("AutoServiceDb", SamplePassword);

        try
        {
            Assert.Equal(8, commands.Count);
            Assert.Contains("ALTER ROLE %I WITH LOGIN PASSWORD %L", commands[1].CommandText, StringComparison.Ordinal);
            Assert.Contains("CREATE ROLE %I WITH LOGIN PASSWORD %L", commands[1].CommandText, StringComparison.Ordinal);
            Assert.Equal(AppRoleProvisioningSql.BuildGrantStatements("AutoServiceDb"), commands.Skip(2).Select(command => command.CommandText));
        }
        finally
        {
            foreach (var command in commands)
            {
                command.Dispose();
            }
        }
    }

    [Theory]
    [InlineData(null, "is missing")]
    [InlineData("   ", "is missing")]
    [InlineData("CHANGE_ME_app_password", "still contains a template placeholder marker")]
    [InlineData("Real-Generated-Password-123", null)]
    public void GetPasswordProblem_RejectsMissingBlankAndTemplateValues(string? password, string? expected)
    {
        Assert.Equal(expected, DatabaseMigrationCommand.GetPasswordProblem(password));
    }

    [Theory]
    [InlineData(new[] { "--migrate-database" }, true)]
    [InlineData(new[] { "--environment", "Production", "--migrate-database" }, true)]
    [InlineData(new[] { "--MIGRATE-DATABASE" }, false)]
    [InlineData(new[] { "--migrate-profile-pictures" }, false)]
    [InlineData(new string[0], false)]
    public void IsRequested_MatchesOnlyTheExactArgument(string[] args, bool expected)
    {
        Assert.Equal(expected, DatabaseMigrationCommand.IsRequested(args));
    }
}

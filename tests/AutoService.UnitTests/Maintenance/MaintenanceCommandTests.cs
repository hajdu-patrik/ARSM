using AutoService.ApiService.Maintenance;
using AutoService.UnitTests.Security;

namespace AutoService.UnitTests.Maintenance;

/** The verification report's verdict, the command switch and the role provisioner's guard before it connects. */
public sealed class MaintenanceCommandTests
{
    private static readonly ProfilePictureMigrationFailure Problem = new(7, "Object is missing from the bucket.");

    [Fact]
    public void A_report_without_problems_passes_and_carries_the_counts_and_schema_version()
    {
        var report = ProfilePictureMigrationReport.Create("verify", 12, 0, [], []);

        Assert.Equal("passed", report.OverallStatus);
        Assert.Equal(1, report.SchemaVersion);
        Assert.Equal("verify", report.Mode);
        Assert.Equal(12, report.Candidates);
        Assert.Equal(0, report.Migrated);
        Assert.Empty(report.Failed);
        Assert.Empty(report.MissingObjects);
    }

    [Fact]
    public void A_missing_object_fails_the_report_and_is_listed_by_person_id()
    {
        var report = ProfilePictureMigrationReport.Create("verify", 3, 0, [], [Problem]);

        Assert.Equal("failed", report.OverallStatus);
        Assert.Equal(Problem, Assert.Single(report.MissingObjects));
    }

    [Fact]
    public void A_failed_row_alone_also_fails_the_report()
    {
        var report = ProfilePictureMigrationReport.Create("verify", 3, 2, [Problem], []);

        Assert.Equal("failed", report.OverallStatus);
        Assert.Equal(Problem, Assert.Single(report.Failed));
    }

    [Theory]
    [InlineData(new[] { "--migrate-profile-pictures" }, true)]
    [InlineData(new[] { "--environment", "Production", "--migrate-profile-pictures" }, true)]
    [InlineData(new[] { "--MIGRATE-PROFILE-PICTURES" }, false)]
    [InlineData(new[] { "--migrate-database" }, false)]
    [InlineData(new string[0], false)]
    public void The_verification_runs_only_for_the_exact_switch(string[] args, bool expected)
    {
        Assert.Equal(expected, ProfilePictureStorageMigrator.IsRequested(args));
    }

    [Theory]
    [InlineData("Host=localhost")]
    [InlineData("Host=localhost;Database=")]
    [InlineData("Host=localhost;Database=   ")]
    public async Task A_connection_string_without_a_database_is_refused_before_any_connection(string connectionString)
    {
        var logger = new RecordingLogger();

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => AppRoleProvisioner.ProvisionAsync(connectionString, "unit-test-password", logger, CancellationToken.None));

        Assert.Equal("The connection string 'AutoServiceDb' names no database.", exception.Message);
        Assert.Empty(logger.Entries);
    }
}

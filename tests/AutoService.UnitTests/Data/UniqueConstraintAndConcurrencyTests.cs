using AutoService.ApiService.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AutoService.UnitTests.Data;

/** Unique-violation detection walks the whole exception chain; a zero version is the one "missing" marker. */
public sealed class UniqueConstraintAndConcurrencyTests
{
    private static PostgresException Postgres(string sqlState) => new("duplicate key", "ERROR", "ERROR", sqlState);

    [Fact]
    public void A_unique_violation_directly_below_the_update_exception_is_detected()
    {
        var exception = new DbUpdateException("save failed", Postgres(PostgresErrorCodes.UniqueViolation));

        Assert.True(UniqueConstraintDetection.IsUniqueConstraintViolation(exception));
    }

    [Fact]
    public void A_unique_violation_nested_deeper_in_the_chain_is_detected()
    {
        var inner = new InvalidOperationException("wrapper", Postgres(PostgresErrorCodes.UniqueViolation));
        var exception = new DbUpdateException("save failed", new AggregateException(inner));

        Assert.True(UniqueConstraintDetection.IsUniqueConstraintViolation(new DbUpdateException("outer", exception)));
    }

    [Theory]
    [InlineData(PostgresErrorCodes.ForeignKeyViolation)]
    [InlineData(PostgresErrorCodes.NotNullViolation)]
    [InlineData(PostgresErrorCodes.CheckViolation)]
    [InlineData(PostgresErrorCodes.SerializationFailure)]
    public void Any_other_postgres_error_is_not_a_unique_violation(string sqlState)
    {
        var exception = new DbUpdateException("save failed", Postgres(sqlState));

        Assert.False(UniqueConstraintDetection.IsUniqueConstraintViolation(exception));
    }

    [Fact]
    public void An_update_exception_with_no_postgres_cause_is_not_a_unique_violation()
    {
        Assert.False(UniqueConstraintDetection.IsUniqueConstraintViolation(new DbUpdateException("save failed")));
        Assert.False(UniqueConstraintDetection.IsUniqueConstraintViolation(
            new DbUpdateException("save failed", new InvalidOperationException("other"))));
    }

    [Fact]
    public void A_missing_version_answers_422_and_any_version_above_zero_is_accepted()
    {
        var missing = OptimisticConcurrency.GetMissingVersionError(0);

        var problem = Assert.IsType<ProblemHttpResult>(missing);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, problem.StatusCode);
        Assert.Equal("Version is required.", problem.ProblemDetails.Detail);
        Assert.Null(OptimisticConcurrency.GetMissingVersionError(1));
        Assert.Null(OptimisticConcurrency.GetMissingVersionError(uint.MaxValue));
    }
}

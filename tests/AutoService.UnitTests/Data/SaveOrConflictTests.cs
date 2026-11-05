using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Http;
using AutoService.UnitTests.Http;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AutoService.UnitTests.Data;

/** A save that loses a race answers the sequential 409 or 404 instead of a 500 (L1-L3 and the unnumbered races). */
public sealed class SaveOrConflictTests
{
    private const string Fallback = "fallback detail";
    private const string CustomerInputDetail = "A person with this email already exists.";

    private static AutoServiceDbContext ContextWithPendingPart(Exception? failure)
    {
        var db = TestDbContextFactory.Create(new ScriptedSaveInterceptor(failure));
        db.Parts.Add(new Part("OLF-1", "Olajszűrő", 4500m, 27));
        return db;
    }

    private static DbUpdateException UniqueViolation() =>
        new("save failed", new PostgresException("duplicate key", "ERROR", "ERROR", PostgresErrorCodes.UniqueViolation));

    [Fact]
    public async Task A_save_that_succeeds_answers_null()
    {
        await using var db = ContextWithPendingPart(failure: null);

        var result = await UniqueConstraintDetection.SaveOrConflictAsync(
            db, _ => Task.FromResult<string?>("unused"), Fallback, CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task A_lost_unique_key_race_answers_the_409_detail_the_lookup_finds_after_clearing_the_tracker()
    {
        await using var db = ContextWithPendingPart(UniqueViolation());
        var trackedWhenLookedUp = -1;

        var result = await UniqueConstraintDetection.SaveOrConflictAsync(
            db,
            _ =>
            {
                trackedWhenLookedUp = db.ChangeTracker.Entries().Count();
                return Task.FromResult<string?>(CustomerInputDetail);
            },
            Fallback,
            CancellationToken.None);

        ResultAssert.Problem(result, 409, CustomerInputDetail);
        Assert.Equal(0, trackedWhenLookedUp);
    }

    [Fact]
    public async Task A_unique_race_the_lookup_cannot_explain_answers_the_fallback_detail()
    {
        await using var db = ContextWithPendingPart(UniqueViolation());

        var result = await UniqueConstraintDetection.SaveOrConflictAsync(
            db, _ => Task.FromResult<string?>(null), Fallback, CancellationToken.None);

        ResultAssert.Problem(result, 409, Fallback);
    }

    [Fact]
    public async Task A_row_deleted_in_parallel_answers_the_row_gone_result_when_one_is_given()
    {
        await using var db = ContextWithPendingPart(new DbUpdateConcurrencyException("row gone"));
        var rowGone = ApiProblem.NotFound("Customer not found.");

        var result = await UniqueConstraintDetection.SaveOrConflictAsync(
            db, _ => Task.FromResult<string?>(null), Fallback, CancellationToken.None, rowGone);

        Assert.Same(rowGone, result);
        ResultAssert.Problem(result, 404, "Customer not found.");
    }

    [Fact]
    public async Task A_concurrency_failure_without_a_row_gone_result_still_propagates()
    {
        await using var db = ContextWithPendingPart(new DbUpdateConcurrencyException("row gone"));

        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => UniqueConstraintDetection.SaveOrConflictAsync(
            db, _ => Task.FromResult<string?>(null), Fallback, CancellationToken.None));
    }

    [Fact]
    public async Task Any_other_database_failure_is_not_turned_into_a_409()
    {
        var foreignKey = new DbUpdateException(
            "save failed", new PostgresException("fk", "ERROR", "ERROR", PostgresErrorCodes.ForeignKeyViolation));
        await using var db = ContextWithPendingPart(foreignKey);

        await Assert.ThrowsAsync<DbUpdateException>(() => UniqueConstraintDetection.SaveOrConflictAsync(
            db, _ => Task.FromResult<string?>(null), Fallback, CancellationToken.None, ApiProblem.NotFound("x")));
    }
}

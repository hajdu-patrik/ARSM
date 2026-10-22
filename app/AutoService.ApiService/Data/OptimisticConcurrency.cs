using AutoService.ApiService.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AutoService.ApiService.Data;

/** An entity whose Postgres xmin is exposed as its version; every write must submit the version it read. */
internal interface IVersioned
{
    uint Version { get; }
}

/** The one optimistic-concurrency rule of the API: xmin as the token, 422 without a version, 409 with a stale one. */
internal static class OptimisticConcurrency
{
    /** xmin exists on every Postgres row and changes on every UPDATE, so the mapping adds no column and needs no data. */
    internal static void MapXminVersion<TEntity>(this EntityTypeBuilder<TEntity> entity)
        where TEntity : class, IVersioned
        => entity.Property(x => x.Version).IsRowVersion().HasColumnName("xmin").HasColumnType("xid");

    /** Postgres never assigns xmin 0 to a live row, so the uint default is unambiguously "missing", never a real stale value. */
    internal static IResult? GetMissingVersionError(uint version)
        => version == 0 ? ApiProblem.Unprocessable("Version is required.") : null;

    /** Saves with the client-submitted version as the original xmin; a stale one fails the save and answers 409 with the code. */
    internal static async Task<IResult?> SaveWithVersionAsync<TEntity>(
        AutoServiceDbContext db,
        TEntity entity,
        uint version,
        string conflictCode,
        CancellationToken cancellationToken)
        where TEntity : class, IVersioned
    {
        db.Entry(entity).Property(x => x.Version).OriginalValue = version;

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return null;
        }
        catch (DbUpdateConcurrencyException)
        {
            return Results.Conflict(new ErrorCodeResponse(conflictCode));
        }
    }
}

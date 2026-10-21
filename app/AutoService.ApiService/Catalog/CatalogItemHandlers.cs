using AutoService.ApiService.Data;
using AutoService.ApiService.Http;
using AutoService.ApiService.Pagination;
using AutoService.ApiService.Validation;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Catalog;

/** The write fields every catalog entry shares: a unique key, a name, a net price and a VAT rate. */
internal readonly record struct CatalogItemInput(string Key, string Name, decimal NetPrice, int VatRatePercent);

/** CRUD for one catalog table (Template Method): this base owns the validation order, paging and status
    codes; a subclass names its key column and messages and maps its entity and DTO. */
internal abstract class CatalogItemHandlers<TEntity, TDto>(
    string keyProperty,
    string routePrefix,
    string notFoundDetail,
    string duplicateKeyDetail)
    where TEntity : class
{
    private const int MaxKeyLength = 40;
    private const int MaxNameLength = 120;

    protected abstract TEntity Create(CatalogItemInput input);

    protected abstract void Apply(TEntity entity, CatalogItemInput input);

    protected abstract TDto ToDto(TEntity entity);

    /** Lists one page ordered by the key, optionally searched by key or name. */
    public async Task<IResult> ListAsync(
        int? page,
        int? pageSize,
        string? search,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var request = ListQueryLimits.NormalizePage(page, pageSize);
        var term = SearchTerm.Normalize(search);

        var query = db.Set<TEntity>().AsNoTracking();
        if (term is not null)
        {
            query = query.Where(e =>
                EF.Property<string>(e, keyProperty).ToUpper().Contains(term) ||
                EF.Property<string>(e, "Name").ToUpper().Contains(term));
        }

        var result = await query
            .OrderBy(e => EF.Property<string>(e, keyProperty))
            .ToPagedResultAsync(request, cancellationToken);

        return Results.Ok(result.Map(ToDto));
    }

    public async Task<IResult> GetAsync(int id, AutoServiceDbContext db, CancellationToken cancellationToken)
    {
        var entity = await FindAsync(db.Set<TEntity>().AsNoTracking(), id, cancellationToken);
        return entity is null ? ApiProblem.NotFound(notFoundDetail) : Results.Ok(ToDto(entity));
    }

    public async Task<IResult> CreateAsync(CatalogItemInput input, AutoServiceDbContext db, CancellationToken cancellationToken)
    {
        var inputError = GetInputError(input);
        if (inputError is not null)
        {
            return ApiProblem.Unprocessable(inputError);
        }

        var normalized = Normalize(input);
        if (await IsKeyTakenAsync(db, normalized.Key, excludeId: null, cancellationToken))
        {
            return ApiProblem.Conflict(duplicateKeyDetail);
        }

        var entity = Create(normalized);
        db.Set<TEntity>().Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        var id = db.Entry(entity).Property<int>("Id").CurrentValue;
        return Results.Created($"{routePrefix}/{id}", ToDto(entity));
    }

    public async Task<IResult> UpdateAsync(
        int id,
        CatalogItemInput input,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var inputError = GetInputError(input);
        if (inputError is not null)
        {
            return ApiProblem.Unprocessable(inputError);
        }

        var normalized = Normalize(input);
        var entity = await FindAsync(db.Set<TEntity>(), id, cancellationToken);
        if (entity is null)
        {
            return ApiProblem.NotFound(notFoundDetail);
        }

        if (await IsKeyTakenAsync(db, normalized.Key, id, cancellationToken))
        {
            return ApiProblem.Conflict(duplicateKeyDetail);
        }

        Apply(entity, normalized);
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    /** Deletes even an entry that quote lines reference: that FK is SET NULL and the lines keep their snapshot. */
    public async Task<IResult> DeleteAsync(int id, AutoServiceDbContext db, CancellationToken cancellationToken)
    {
        var entity = await FindAsync(db.Set<TEntity>(), id, cancellationToken);
        if (entity is null)
        {
            return ApiProblem.NotFound(notFoundDetail);
        }

        db.Set<TEntity>().Remove(entity);
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private string? GetInputError(CatalogItemInput input)
    {
        if (string.IsNullOrWhiteSpace(input.Key) || string.IsNullOrWhiteSpace(input.Name))
        {
            return $"{keyProperty} and Name are required.";
        }

        if (input.Key.Trim().Length > MaxKeyLength)
        {
            return $"{keyProperty} must be at most {MaxKeyLength} characters.";
        }

        if (input.Name.Trim().Length > MaxNameLength)
        {
            return $"Name must be at most {MaxNameLength} characters.";
        }

        return PricingValidation.GetMoneyAmountValidationError(input.NetPrice)
            ?? PricingValidation.GetVatRateValidationError(input.VatRatePercent);
    }

    /** Keys are stored trimmed and upper-case, names trimmed. */
    private static CatalogItemInput Normalize(CatalogItemInput input)
        => input with { Key = input.Key.Trim().ToUpperInvariant(), Name = input.Name.Trim() };

    private static Task<TEntity?> FindAsync(IQueryable<TEntity> query, int id, CancellationToken cancellationToken)
        => query.FirstOrDefaultAsync(e => EF.Property<int>(e, "Id") == id, cancellationToken);

    private Task<bool> IsKeyTakenAsync(
        AutoServiceDbContext db,
        string key,
        int? excludeId,
        CancellationToken cancellationToken)
    {
        var query = db.Set<TEntity>().Where(e => EF.Property<string>(e, keyProperty) == key);
        if (excludeId is int id)
        {
            query = query.Where(e => EF.Property<int>(e, "Id") != id);
        }

        return query.AnyAsync(cancellationToken);
    }
}

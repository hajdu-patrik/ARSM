using AutoService.ApiService.Data;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Validation;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    /** Parses LineKind and validates Quantity, shared by the add- and update-line handlers (D24). */
    private static IResult? TryParseLineRequestBasics(string lineKindRaw, decimal quantity, out QuoteLineKind lineKind)
    {
        if (!DefinedEnum.TryParse(lineKindRaw, out lineKind))
        {
            return ApiProblem.Unprocessable($"LineKind must be one of: {string.Join(", ", Enum.GetNames<QuoteLineKind>())}.");
        }

        var quantityError = PricingValidation.GetQuantityValidationError(quantity);
        if (quantityError is not null)
        {
            return ApiProblem.Unprocessable(quantityError);
        }

        return null;
    }

    /** Enforces line-kind integrity (D4/D5) ahead of CK_QuoteLines_LineKindIntegrity: a Part line
     * must not carry a LaborTypeId and vice versa. */
    private static IResult? GetLineKindIntegrityError(QuoteLineKind lineKind, int? partId, int? laborTypeId)
    {
        if (lineKind == QuoteLineKind.Part && laborTypeId is not null)
        {
            return ApiProblem.Unprocessable("A part line cannot reference a labor type.");
        }

        if (lineKind == QuoteLineKind.Labor && partId is not null)
        {
            return ApiProblem.Unprocessable("A labor line cannot reference a part.");
        }

        return null;
    }

    /** Loads the Part or LaborType snapshot for a quote line when a catalog id is given (D4/D5/D40). */
    private static async Task<(QuoteLineSnapshot? Catalog, IResult? Error)> TryLoadCatalogSnapshotAsync(
        QuoteLineKind lineKind,
        int? partId,
        int? laborTypeId,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (lineKind == QuoteLineKind.Part && partId is not null)
        {
            var part = await db.Parts.AsNoTracking().FirstOrDefaultAsync(p => p.Id == partId, cancellationToken);
            if (part is null)
            {
                return (null, ApiProblem.NotFound("Part not found."));
            }

            return (new QuoteLineSnapshot(part.Name, part.NetUnitPrice, part.VatRatePercent), null);
        }

        if (lineKind == QuoteLineKind.Labor && laborTypeId is not null)
        {
            var laborType = await db.LaborTypes.AsNoTracking().FirstOrDefaultAsync(l => l.Id == laborTypeId, cancellationToken);
            if (laborType is null)
            {
                return (null, ApiProblem.NotFound("Labor type not found."));
            }

            return (new QuoteLineSnapshot(laborType.Name, laborType.HourlyNetRate, laborType.VatRatePercent), null);
        }

        return (null, null);
    }

    /** Validates the resolved description length and money/VAT bounds shared by every quote line, catalog-sourced or manual (D24). */
    private static IResult? GetLineSnapshotFieldError(string description, decimal netUnitPrice, int vatRatePercent)
    {
        if (description.Length > MaxLineDescriptionLength)
        {
            return ApiProblem.Unprocessable($"Description must be at most {MaxLineDescriptionLength} characters.");
        }

        var moneyError = PricingValidation.GetMoneyAmountValidationError(netUnitPrice);
        if (moneyError is not null)
        {
            return ApiProblem.Unprocessable(moneyError);
        }

        var vatError = PricingValidation.GetVatRateValidationError(vatRatePercent);
        if (vatError is not null)
        {
            return ApiProblem.Unprocessable(vatError);
        }

        return null;
    }

    /** Resolves description/net unit price/VAT rate for a quote line (D40): snapshots from the Part
     * or LaborType when a catalog id is given (D4/D5), but any request override wins; without a catalog id all three are required. */
    private static async Task<(QuoteLineSnapshot Snapshot, IResult? Error)> ResolveQuoteLineSnapshotAsync(
        QuoteLineKind lineKind,
        int? partId,
        int? laborTypeId,
        string? description,
        decimal? netUnitPrice,
        int? vatRatePercent,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var integrityError = GetLineKindIntegrityError(lineKind, partId, laborTypeId);
        if (integrityError is not null)
        {
            return (default, integrityError);
        }

        var (catalog, catalogError) = await TryLoadCatalogSnapshotAsync(lineKind, partId, laborTypeId, db, cancellationToken);
        if (catalogError is not null)
        {
            return (default, catalogError);
        }

        var resolvedDescription = !string.IsNullOrWhiteSpace(description) ? description.Trim() : catalog?.Description;
        var resolvedNetUnitPrice = netUnitPrice ?? catalog?.NetUnitPrice;
        var resolvedVatRatePercent = vatRatePercent ?? catalog?.VatRatePercent;

        if (resolvedDescription is null || resolvedNetUnitPrice is null || resolvedVatRatePercent is null)
        {
            return (default, ApiProblem.Unprocessable("Description, NetUnitPrice, and VatRatePercent are required when no catalog reference is provided."));
        }

        var fieldError = GetLineSnapshotFieldError(resolvedDescription, resolvedNetUnitPrice.Value, resolvedVatRatePercent.Value);
        if (fieldError is not null)
        {
            return (default, fieldError);
        }

        return (new QuoteLineSnapshot(resolvedDescription, resolvedNetUnitPrice.Value, resolvedVatRatePercent.Value), null);
    }
}

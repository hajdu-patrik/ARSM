using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Pricing;
using AutoService.ApiService.Validation;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    /** Parses LineKind and validates Quantity, shared by the add- and update-line handlers (D24). */
    private static IResult? TryParseLineRequestBasics(string lineKindRaw, decimal quantity, out QuoteLineKind lineKind)
    {
        if (!Enum.TryParse(lineKindRaw, ignoreCase: true, out lineKind))
        {
            return Results.Problem(
                detail: $"LineKind must be one of: {string.Join(", ", Enum.GetNames<QuoteLineKind>())}.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var quantityError = PricingValidation.GetQuantityValidationError(quantity);
        if (quantityError is not null)
        {
            return Results.Problem(detail: quantityError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        return null;
    }

    /** Enforces line-kind integrity (D4/D5) ahead of CK_QuoteLines_LineKindIntegrity: a Part line
     * must not carry a LaborTypeId and vice versa. */
    private static IResult? GetLineKindIntegrityError(QuoteLineKind lineKind, int? partId, int? laborTypeId)
    {
        if (lineKind == QuoteLineKind.Part && laborTypeId is not null)
        {
            return Results.Problem(
                detail: "A part line cannot reference a labor type.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (lineKind == QuoteLineKind.Labor && partId is not null)
        {
            return Results.Problem(
                detail: "A labor line cannot reference a part.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
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
                return (null, Results.Problem(detail: "Part not found.", statusCode: StatusCodes.Status404NotFound));
            }

            return (new QuoteLineSnapshot(part.Name, part.NetUnitPrice, part.VatRatePercent), null);
        }

        if (lineKind == QuoteLineKind.Labor && laborTypeId is not null)
        {
            var laborType = await db.LaborTypes.AsNoTracking().FirstOrDefaultAsync(l => l.Id == laborTypeId, cancellationToken);
            if (laborType is null)
            {
                return (null, Results.Problem(detail: "Labor type not found.", statusCode: StatusCodes.Status404NotFound));
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
            return Results.Problem(
                detail: $"Description must be at most {MaxLineDescriptionLength} characters.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var moneyError = PricingValidation.GetMoneyAmountValidationError(netUnitPrice);
        if (moneyError is not null)
        {
            return Results.Problem(detail: moneyError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var vatError = PricingValidation.GetVatRateValidationError(vatRatePercent);
        if (vatError is not null)
        {
            return Results.Problem(detail: vatError, statusCode: StatusCodes.Status422UnprocessableEntity);
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
            return (default, Results.Problem(
                detail: "Description, NetUnitPrice, and VatRatePercent are required when no catalog reference is provided.",
                statusCode: StatusCodes.Status422UnprocessableEntity));
        }

        var fieldError = GetLineSnapshotFieldError(resolvedDescription, resolvedNetUnitPrice.Value, resolvedVatRatePercent.Value);
        if (fieldError is not null)
        {
            return (default, fieldError);
        }

        return (new QuoteLineSnapshot(resolvedDescription, resolvedNetUnitPrice.Value, resolvedVatRatePercent.Value), null);
    }
}

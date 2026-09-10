using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Catalog;

public static partial class PartEndpoints
{
    private const int MaxPartNumberLength = 40;
    private const int MaxPartNameLength = 120;

    private static async Task<IResult> CreatePartAsync(
        CreatePartRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.PartNumber) || string.IsNullOrWhiteSpace(request.Name))
        {
            return Results.Problem(
                detail: "PartNumber and Name are required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var lengthValidationError = GetPartFieldLengthValidationError(request.PartNumber, request.Name);
        if (lengthValidationError is not null)
        {
            return Results.Problem(
                detail: lengthValidationError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var moneyError = PricingValidation.GetMoneyAmountValidationError(request.NetUnitPrice);
        if (moneyError is not null)
        {
            return Results.Problem(detail: moneyError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var vatError = PricingValidation.GetVatRateValidationError(request.VatRatePercent);
        if (vatError is not null)
        {
            return Results.Problem(detail: vatError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!PartNumberNormalization.TryNormalize(request.PartNumber, out var normalizedPartNumber, out var partNumberError))
        {
            return Results.Problem(
                detail: partNumberError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var partNumberExists = await db.Parts
            .AnyAsync(p => p.PartNumber == normalizedPartNumber, cancellationToken);

        if (partNumberExists)
        {
            return Results.Problem(
                detail: "A part with this part number already exists.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var part = new Part(
            normalizedPartNumber,
            request.Name.Trim(),
            request.NetUnitPrice,
            request.VatRatePercent);

        db.Parts.Add(part);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created($"/api/parts/{part.Id}", ToPartDto(part));
    }

    private static async Task<IResult> UpdatePartAsync(
        int id,
        UpdatePartRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.PartNumber) || string.IsNullOrWhiteSpace(request.Name))
        {
            return Results.Problem(
                detail: "PartNumber and Name are required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var lengthValidationError = GetPartFieldLengthValidationError(request.PartNumber, request.Name);
        if (lengthValidationError is not null)
        {
            return Results.Problem(
                detail: lengthValidationError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var moneyError = PricingValidation.GetMoneyAmountValidationError(request.NetUnitPrice);
        if (moneyError is not null)
        {
            return Results.Problem(detail: moneyError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var vatError = PricingValidation.GetVatRateValidationError(request.VatRatePercent);
        if (vatError is not null)
        {
            return Results.Problem(detail: vatError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!PartNumberNormalization.TryNormalize(request.PartNumber, out var normalizedPartNumber, out var partNumberError))
        {
            return Results.Problem(
                detail: partNumberError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var part = await db.Parts
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (part is null)
        {
            return Results.Problem(
                detail: "Part not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var partNumberConflict = await db.Parts
            .AnyAsync(p => p.PartNumber == normalizedPartNumber && p.Id != id, cancellationToken);

        if (partNumberConflict)
        {
            return Results.Problem(
                detail: "A part with this part number already exists.",
                statusCode: StatusCodes.Status409Conflict);
        }

        part.PartNumber = normalizedPartNumber;
        part.Name = request.Name.Trim();
        part.NetUnitPrice = request.NetUnitPrice;
        part.VatRatePercent = request.VatRatePercent;

        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> DeletePartAsync(
        int id,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var part = await db.Parts
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (part is null)
        {
            return Results.Problem(
                detail: "Part not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        // Deletable even when referenced by quote lines: the F3 relationship is
        // SetNull, so existing quote lines keep their snapshotted name/price/VAT.
        db.Parts.Remove(part);
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    internal static string? GetPartFieldLengthValidationError(
        string partNumber,
        string name,
        string? fieldPrefix = null)
    {
        var prefix = fieldPrefix ?? string.Empty;

        if (partNumber.Trim().Length > MaxPartNumberLength)
        {
            return $"{prefix}PartNumber must be at most {MaxPartNumberLength} characters.";
        }

        if (name.Trim().Length > MaxPartNameLength)
        {
            return $"{prefix}Name must be at most {MaxPartNameLength} characters.";
        }

        return null;
    }
}

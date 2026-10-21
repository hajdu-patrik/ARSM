using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;

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
            return ApiProblem.Unprocessable("PartNumber and Name are required.");
        }

        var lengthValidationError = GetPartFieldLengthValidationError(request.PartNumber, request.Name);
        if (lengthValidationError is not null)
        {
            return ApiProblem.Unprocessable(lengthValidationError);
        }

        var moneyError = PricingValidation.GetMoneyAmountValidationError(request.NetUnitPrice);
        if (moneyError is not null)
        {
            return ApiProblem.Unprocessable(moneyError);
        }

        var vatError = PricingValidation.GetVatRateValidationError(request.VatRatePercent);
        if (vatError is not null)
        {
            return ApiProblem.Unprocessable(vatError);
        }

        if (!PartNumberNormalization.TryNormalize(request.PartNumber, out var normalizedPartNumber, out var partNumberError))
        {
            return ApiProblem.Unprocessable(partNumberError);
        }

        var partNumberExists = await db.Parts
            .AnyAsync(p => p.PartNumber == normalizedPartNumber, cancellationToken);

        if (partNumberExists)
        {
            return ApiProblem.Conflict("A part with this part number already exists.");
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
            return ApiProblem.Unprocessable("PartNumber and Name are required.");
        }

        var lengthValidationError = GetPartFieldLengthValidationError(request.PartNumber, request.Name);
        if (lengthValidationError is not null)
        {
            return ApiProblem.Unprocessable(lengthValidationError);
        }

        var moneyError = PricingValidation.GetMoneyAmountValidationError(request.NetUnitPrice);
        if (moneyError is not null)
        {
            return ApiProblem.Unprocessable(moneyError);
        }

        var vatError = PricingValidation.GetVatRateValidationError(request.VatRatePercent);
        if (vatError is not null)
        {
            return ApiProblem.Unprocessable(vatError);
        }

        if (!PartNumberNormalization.TryNormalize(request.PartNumber, out var normalizedPartNumber, out var partNumberError))
        {
            return ApiProblem.Unprocessable(partNumberError);
        }

        var part = await db.Parts
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (part is null)
        {
            return ApiProblem.NotFound("Part not found.");
        }

        var partNumberConflict = await db.Parts
            .AnyAsync(p => p.PartNumber == normalizedPartNumber && p.Id != id, cancellationToken);

        if (partNumberConflict)
        {
            return ApiProblem.Conflict("A part with this part number already exists.");
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
            return ApiProblem.NotFound("Part not found.");
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

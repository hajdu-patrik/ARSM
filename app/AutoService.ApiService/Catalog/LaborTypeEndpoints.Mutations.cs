using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Catalog;

public static partial class LaborTypeEndpoints
{
    private const int MaxCodeLength = 40;
    private const int MaxLaborTypeNameLength = 120;

    private static async Task<IResult> CreateLaborTypeAsync(
        CreateLaborTypeRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            return Results.Problem(
                detail: "Code and Name are required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var lengthValidationError = GetLaborTypeFieldLengthValidationError(request.Code, request.Name);
        if (lengthValidationError is not null)
        {
            return Results.Problem(
                detail: lengthValidationError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var moneyError = PricingValidation.GetMoneyAmountValidationError(request.HourlyNetRate);
        if (moneyError is not null)
        {
            return Results.Problem(detail: moneyError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var vatError = PricingValidation.GetVatRateValidationError(request.VatRatePercent);
        if (vatError is not null)
        {
            return Results.Problem(detail: vatError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!LaborTypeCodeNormalization.TryNormalize(request.Code, out var normalizedCode, out var codeError))
        {
            return Results.Problem(
                detail: codeError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var codeExists = await db.LaborTypes
            .AnyAsync(l => l.Code == normalizedCode, cancellationToken);

        if (codeExists)
        {
            return Results.Problem(
                detail: "A labor type with this code already exists.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var laborType = new LaborType(
            normalizedCode,
            request.Name.Trim(),
            request.HourlyNetRate,
            request.VatRatePercent);

        db.LaborTypes.Add(laborType);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created($"/api/labor-types/{laborType.Id}", ToLaborTypeDto(laborType));
    }

    private static async Task<IResult> UpdateLaborTypeAsync(
        int id,
        UpdateLaborTypeRequest request,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            return Results.Problem(
                detail: "Code and Name are required.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var lengthValidationError = GetLaborTypeFieldLengthValidationError(request.Code, request.Name);
        if (lengthValidationError is not null)
        {
            return Results.Problem(
                detail: lengthValidationError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var moneyError = PricingValidation.GetMoneyAmountValidationError(request.HourlyNetRate);
        if (moneyError is not null)
        {
            return Results.Problem(detail: moneyError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var vatError = PricingValidation.GetVatRateValidationError(request.VatRatePercent);
        if (vatError is not null)
        {
            return Results.Problem(detail: vatError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        if (!LaborTypeCodeNormalization.TryNormalize(request.Code, out var normalizedCode, out var codeError))
        {
            return Results.Problem(
                detail: codeError,
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var laborType = await db.LaborTypes
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);

        if (laborType is null)
        {
            return Results.Problem(
                detail: "Labor type not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var codeConflict = await db.LaborTypes
            .AnyAsync(l => l.Code == normalizedCode && l.Id != id, cancellationToken);

        if (codeConflict)
        {
            return Results.Problem(
                detail: "A labor type with this code already exists.",
                statusCode: StatusCodes.Status409Conflict);
        }

        laborType.Code = normalizedCode;
        laborType.Name = request.Name.Trim();
        laborType.HourlyNetRate = request.HourlyNetRate;
        laborType.VatRatePercent = request.VatRatePercent;

        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    private static async Task<IResult> DeleteLaborTypeAsync(
        int id,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var laborType = await db.LaborTypes
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);

        if (laborType is null)
        {
            return Results.Problem(
                detail: "Labor type not found.",
                statusCode: StatusCodes.Status404NotFound);
        }

        // Deletable even when referenced by quote lines: the F3 relationship is
        // SetNull, so existing quote lines keep their snapshotted name/rate/VAT.
        db.LaborTypes.Remove(laborType);
        await db.SaveChangesAsync(cancellationToken);

        return Results.NoContent();
    }

    internal static string? GetLaborTypeFieldLengthValidationError(
        string code,
        string name,
        string? fieldPrefix = null)
    {
        var prefix = fieldPrefix ?? string.Empty;

        if (code.Trim().Length > MaxCodeLength)
        {
            return $"{prefix}Code must be at most {MaxCodeLength} characters.";
        }

        if (name.Trim().Length > MaxLaborTypeNameLength)
        {
            return $"{prefix}Name must be at most {MaxLaborTypeNameLength} characters.";
        }

        return null;
    }
}

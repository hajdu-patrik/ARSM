using AutoService.ApiService.Normalization;
using AutoService.ApiService.Validation;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;

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
            return ApiProblem.Unprocessable("Code and Name are required.");
        }

        var lengthValidationError = GetLaborTypeFieldLengthValidationError(request.Code, request.Name);
        if (lengthValidationError is not null)
        {
            return ApiProblem.Unprocessable(lengthValidationError);
        }

        var moneyError = PricingValidation.GetMoneyAmountValidationError(request.HourlyNetRate);
        if (moneyError is not null)
        {
            return ApiProblem.Unprocessable(moneyError);
        }

        var vatError = PricingValidation.GetVatRateValidationError(request.VatRatePercent);
        if (vatError is not null)
        {
            return ApiProblem.Unprocessable(vatError);
        }

        if (!LaborTypeCodeNormalization.TryNormalize(request.Code, out var normalizedCode, out var codeError))
        {
            return ApiProblem.Unprocessable(codeError);
        }

        var codeExists = await db.LaborTypes
            .AnyAsync(l => l.Code == normalizedCode, cancellationToken);

        if (codeExists)
        {
            return ApiProblem.Conflict("A labor type with this code already exists.");
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
            return ApiProblem.Unprocessable("Code and Name are required.");
        }

        var lengthValidationError = GetLaborTypeFieldLengthValidationError(request.Code, request.Name);
        if (lengthValidationError is not null)
        {
            return ApiProblem.Unprocessable(lengthValidationError);
        }

        var moneyError = PricingValidation.GetMoneyAmountValidationError(request.HourlyNetRate);
        if (moneyError is not null)
        {
            return ApiProblem.Unprocessable(moneyError);
        }

        var vatError = PricingValidation.GetVatRateValidationError(request.VatRatePercent);
        if (vatError is not null)
        {
            return ApiProblem.Unprocessable(vatError);
        }

        if (!LaborTypeCodeNormalization.TryNormalize(request.Code, out var normalizedCode, out var codeError))
        {
            return ApiProblem.Unprocessable(codeError);
        }

        var laborType = await db.LaborTypes
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);

        if (laborType is null)
        {
            return ApiProblem.NotFound("Labor type not found.");
        }

        var codeConflict = await db.LaborTypes
            .AnyAsync(l => l.Code == normalizedCode && l.Id != id, cancellationToken);

        if (codeConflict)
        {
            return ApiProblem.Conflict("A labor type with this code already exists.");
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
            return ApiProblem.NotFound("Labor type not found.");
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

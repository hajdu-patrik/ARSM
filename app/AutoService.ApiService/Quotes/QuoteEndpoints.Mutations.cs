using System.Security.Claims;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Validation;
using Microsoft.EntityFrameworkCore;
using AutoService.ApiService.Http;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Identity;
using AutoService.ApiService.Lifecycle;
using AutoService.ApiService.Normalization;

namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    /** Creates a draft quote anchored to a vehicle (D1): ValidUntil defaults to +30 days (D22), the
     * number comes from QuoteNumberGenerator (D13), and the mechanic is resolved from the person_id claim (D15). */
    private static async Task<IResult> CreateQuoteAsync(
        int vehicleId,
        CreateQuoteRequest request,
        ClaimsPrincipal user,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var titleError = QuoteValidation.GetTitleValidationError(request.Title);
        if (titleError is not null)
        {
            return ApiProblem.Unprocessable(titleError);
        }

        var notesError = GetNotesValidationError(request.Notes);
        if (notesError is not null)
        {
            return ApiProblem.Unprocessable(notesError);
        }

        var nowUtc = DateTime.UtcNow;
        var validUntil = request.ValidUntil is not null
            ? DateTimeNormalization.ToUtc(request.ValidUntil.Value)
            : nowUtc.AddDays(30);

        if (request.ValidUntil is not null)
        {
            var validUntilError = QuoteValidation.GetValidUntilValidationError(validUntil, nowUtc);
            if (validUntilError is not null)
            {
                return ApiProblem.Unprocessable(validUntilError);
            }
        }

        if (!user.TryGetPersonId(out var mechanicId))
        {
            return Results.Unauthorized();
        }

        var mechanicExists = await db.Mechanics.AnyAsync(m => m.Id == mechanicId, cancellationToken);
        if (!mechanicExists)
        {
            return Results.Unauthorized();
        }

        var vehicleExists = await db.Vehicles.AnyAsync(v => v.Id == vehicleId, cancellationToken);
        if (!vehicleExists)
        {
            return ApiProblem.NotFound("Vehicle not found.");
        }

        if (request.AppointmentId is not null)
        {
            var appointment = await db.Appointments
                .FirstOrDefaultAsync(a => a.Id == request.AppointmentId, cancellationToken);

            if (appointment is null)
            {
                return ApiProblem.NotFound("Appointment not found.");
            }

            if (appointment.VehicleId != vehicleId)
            {
                return ApiProblem.Unprocessable("Appointment does not belong to the specified vehicle.");
            }

            var lockReason = await ResolveAppointmentLockReasonAsync(
                appointment.Id, appointment.Status, db, cancellationToken);
            if (lockReason is not null)
            {
                return ConflictWithCode(AppointmentQuoteLifecycle.ToLockErrorCode(lockReason));
            }
        }

        var quote = new Quote(
            request.Title.Trim(),
            NormalizeOptionalNotes(request.Notes),
            validUntil,
            vehicleId,
            request.AppointmentId,
            mechanicId);

        var generator = new QuoteNumberGenerator(db);
        await generator.CreateAsync(quote, cancellationToken);

        await db.Entry(quote).Reference(q => q.Vehicle).LoadAsync(cancellationToken);
        if (quote.CreatedByMechanicId is not null)
        {
            await db.Entry(quote).Reference(q => q.CreatedByMechanic).LoadAsync(cancellationToken);
        }

        return Results.Created($"/api/quotes/{quote.Id}", ToQuoteDetailDto(quote, DateTime.UtcNow, lockReason: null));
    }

    /** Deletes a quote by the appointment matrix: Completed never, Cancelled in any status, else Draft only (D7);
     * the version arrives as a query parameter on DELETE (D30/D38/D39). */
    private static async Task<IResult> DeleteQuoteAsync(
        int id,
        uint version,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var quote = await IncludeDetails(db.Quotes)
            .FirstOrDefaultAsync(q => q.Id == id, cancellationToken);

        if (quote is null)
        {
            return ApiProblem.NotFound("Quote not found.");
        }

        if (quote.Appointment?.Status == ProgressStatus.Completed)
        {
            return ConflictWithCode(LifecycleErrorCodes.QuoteLockedAppointmentCompleted);
        }

        if (!AppointmentQuoteLifecycle.CanDeleteQuote(quote.Status, quote.Appointment?.Status))
        {
            return ApiProblem.Conflict("Only draft quotes can be deleted.");
        }

        var missingVersionError = OptimisticConcurrency.GetMissingVersionError(version);
        if (missingVersionError is not null)
        {
            return missingVersionError;
        }

        db.Quotes.Remove(quote);
        var saveError = await SaveWithVersionAsync(db, quote, version, cancellationToken);
        if (saveError is not null)
        {
            return saveError;
        }

        return Results.NoContent();
    }
}

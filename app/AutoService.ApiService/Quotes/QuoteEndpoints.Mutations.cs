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
        var requestError = GetCreateQuoteRequestError(request, DateTime.UtcNow, out var validUntil);
        if (requestError is not null)
        {
            return requestError;
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

        var appointmentError = await GetQuoteAppointmentErrorAsync(request.AppointmentId, vehicleId, db, cancellationToken);
        if (appointmentError is not null)
        {
            return appointmentError;
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

    /** Title, notes and optional valid-until checks (422); the valid-until falls back to +30 days (D22). */
    private static IResult? GetCreateQuoteRequestError(CreateQuoteRequest request, DateTime nowUtc, out DateTime validUntil)
    {
        validUntil = request.ValidUntil is not null
            ? DateTimeNormalization.ToUtc(request.ValidUntil.Value)
            : nowUtc.AddDays(30);

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

        if (request.ValidUntil is null)
        {
            return null;
        }

        var validUntilError = QuoteValidation.GetValidUntilValidationError(validUntil, nowUtc);
        return validUntilError is null ? null : ApiProblem.Unprocessable(validUntilError);
    }

    /** The linked appointment must exist (404), belong to the vehicle (422) and not lock its quotes (409); null when none is linked. */
    private static async Task<IResult?> GetQuoteAppointmentErrorAsync(
        int? appointmentId,
        int vehicleId,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        if (appointmentId is null)
        {
            return null;
        }

        var appointment = await db.Appointments
            .FirstOrDefaultAsync(a => a.Id == appointmentId, cancellationToken);

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
        return lockReason is null ? null : ConflictWithCode(AppointmentQuoteLifecycle.ToLockErrorCode(lockReason));
    }

    /** Deletes a quote by the appointment matrix: Completed never, Cancelled in any status, else Draft only (D7);
     * the version arrives as a query parameter on DELETE (D30/D38/D39). */
    private static async Task<IResult> DeleteQuoteAsync(
        int id,
        uint? version,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        // A missing ?version= binds to null and gets the documented 422, not a model-binding 400.
        var submittedVersion = version ?? 0;

        var quote = await db.Quotes
            .Include(q => q.Appointment)
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

        var missingVersionError = OptimisticConcurrency.GetMissingVersionError(submittedVersion);
        if (missingVersionError is not null)
        {
            return missingVersionError;
        }

        db.Quotes.Remove(quote);
        var saveError = await SaveWithVersionAsync(db, quote, submittedVersion, cancellationToken);
        if (saveError is not null)
        {
            return saveError;
        }

        return Results.NoContent();
    }
}

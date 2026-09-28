using System.Security.Claims;
using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Validation;
using Microsoft.EntityFrameworkCore;

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
            return Results.Problem(detail: titleError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var notesError = GetNotesValidationError(request.Notes);
        if (notesError is not null)
        {
            return Results.Problem(detail: notesError, statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var nowUtc = DateTime.UtcNow;
        var validUntil = request.ValidUntil is not null
            ? NormalizeToUtc(request.ValidUntil.Value)
            : nowUtc.AddDays(30);

        if (request.ValidUntil is not null)
        {
            var validUntilError = QuoteValidation.GetValidUntilValidationError(validUntil, nowUtc);
            if (validUntilError is not null)
            {
                return Results.Problem(detail: validUntilError, statusCode: StatusCodes.Status422UnprocessableEntity);
            }
        }

        var personIdClaim = user.FindFirst("person_id")?.Value;
        if (string.IsNullOrWhiteSpace(personIdClaim) || !int.TryParse(personIdClaim, out var mechanicId))
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
            return Results.Problem(detail: "Vehicle not found.", statusCode: StatusCodes.Status404NotFound);
        }

        if (request.AppointmentId is not null)
        {
            var appointment = await db.Appointments
                .FirstOrDefaultAsync(a => a.Id == request.AppointmentId, cancellationToken);

            if (appointment is null)
            {
                return Results.Problem(detail: "Appointment not found.", statusCode: StatusCodes.Status404NotFound);
            }

            if (appointment.VehicleId != vehicleId)
            {
                return Results.Problem(
                    detail: "Appointment does not belong to the specified vehicle.",
                    statusCode: StatusCodes.Status422UnprocessableEntity);
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

        return Results.Created($"/api/quotes/{quote.Id}", ToQuoteDetailDto(quote, DateTime.UtcNow));
    }

    /** Deletes a draft quote (D7: only Draft is deletable) under optimistic concurrency (D30/D38/D39: version arrives as a query parameter on DELETE). */
    private static async Task<IResult> DeleteQuoteAsync(
        int id,
        uint version,
        AutoServiceDbContext db,
        CancellationToken cancellationToken)
    {
        var (quote, loadError) = await LoadDraftQuoteAsync(
            id, version, "Only draft quotes can be deleted.", db, cancellationToken);

        if (loadError is not null)
        {
            return loadError;
        }

        db.Quotes.Remove(quote!);
        SeedOriginalVersion(db, quote!, version);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return QuoteVersionConflictResult();
        }

        return Results.NoContent();
    }
}

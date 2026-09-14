using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.CodeAnalysis;
using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.ApiService.Domain;

/**
 * Price quote for a vehicle, with part and labor lines, a status lifecycle,
 * and stored net/VAT/gross totals kept in sync by
 * AutoServiceDbContext.ValidateQuoteTotals on every save.
 */
public class Quote
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; private set; }

    // Assigned by Quotes/QuoteNumberGenerator after construction, the same
    // way Id is assigned by the database, so it is not a constructor
    // parameter and is not marked required.
    [MaxLength(20)]
    public string QuoteNumber { get; set; } = string.Empty;

    [MaxLength(120)]
    public required string Title { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public QuoteStatus Status { get; set; } = QuoteStatus.Draft;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Validity deadline (D7). Defaults to +30 days, decided by the caller
    // (endpoint layer), not here, so the rule stays in one place (D22).
    public required DateTime ValidUntil { get; set; }

    public DateTime? SentAt { get; set; }
    public DateTime? DecidedAt { get; set; }

    // Relationship: each quote is anchored to exactly one vehicle (D1).
    public int VehicleId { get; set; }
    public Vehicle Vehicle { get; set; } = null!;

    // Relationship: optional link to the appointment the quote was raised for (D1).
    public int? AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    // Relationship: the mechanic who created the quote (D15). Nullable
    // because a departing mechanic's quotes are kept, not deleted (SetNull).
    public int? CreatedByMechanicId { get; set; }
    public Mechanic? CreatedByMechanic { get; set; }

    // Stored, not computed on read: shared by the C# handler, the PDF, and
    // the SQL revenue aggregation, all of which must agree on one number.
    // Recomputed in one place (Pricing/QuoteTotalsCalculator) and guarded by
    // AutoServiceDbContext.ValidateQuoteTotals on every save.
    public decimal TotalNet { get; set; }
    public decimal TotalVat { get; set; }
    public decimal TotalGross { get; set; }

    // Optimistic-concurrency token (D30) mapped to the Postgres xmin system
    // column in AutoServiceDbContext.QuotesModel.cs; not a real column, and
    // never assigned by application code.
    public uint Version { get; private set; }

    public ICollection<QuoteLine> Lines { get; set; } = new List<QuoteLine>();

    /**
     * Parameterless constructor required by EF Core.
     */
    public Quote() {}

    /**
     * Creates a draft quote anchored to a vehicle.
     *
     * @param title Short required title (D14).
     * @param notes Optional free-text notes (D14).
     * @param validUntil Validity deadline; the +30-day default is computed by the caller (D22).
     * @param vehicleId Vehicle the quote is anchored to (required, D1).
     * @param appointmentId Optional appointment link (D1).
     * @param createdByMechanicId Mechanic who created the quote (D15).
     */
    [SetsRequiredMembers]
    public Quote(
        string title,
        string? notes,
        DateTime validUntil,
        int vehicleId,
        int? appointmentId,
        int? createdByMechanicId)
    {
        Title = title;
        Notes = notes;
        ValidUntil = validUntil;
        VehicleId = vehicleId;
        AppointmentId = appointmentId;
        CreatedByMechanicId = createdByMechanicId;
    }
}

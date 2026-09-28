using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.CodeAnalysis;
using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.ApiService.Domain;

/** Price quote for a vehicle: lines, status lifecycle, and totals kept in sync by AutoServiceDbContext.ValidateQuoteTotals (CLAUDE.md Quote Anchors). */
public class Quote
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; private set; }

    // Assigned by Quotes/QuoteNumberGenerator after construction (like Id by
    // the database), so it is not a constructor parameter or required.
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

    // Stored, not computed on read; recomputed only via
    // Pricing/QuoteTotalsCalculator (see CLAUDE.md Quote Anchors).
    public decimal TotalNet { get; set; }
    public decimal TotalVat { get; set; }
    public decimal TotalGross { get; set; }

    // Optimistic-concurrency token (D30) mapped to Postgres xmin in
    // AutoServiceDbContext.QuotesModel.cs; not a real column (CLAUDE.md Quote Anchors).
    public uint Version { get; private set; }

    public ICollection<QuoteLine> Lines { get; set; } = new List<QuoteLine>();

    /** Parameterless constructor required by EF Core. */
    public Quote() {}

    /** Creates a draft quote anchored to a vehicle. */
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

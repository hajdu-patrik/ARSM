using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.CodeAnalysis;
using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.ApiService.Domain;

/**
 * A single part or labor line on a Quote. Description, unit price, and VAT
 * rate are snapshots taken from the catalog (or entered manually) when the
 * line is created, so a later catalog change or deletion never changes an
 * existing quote (D4, D5).
 */
public class QuoteLine
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; private set; }

    // Relationship: each line belongs to exactly one quote.
    public int QuoteId { get; set; }
    public Quote Quote { get; set; } = null!;

    public required QuoteLineKind LineKind { get; set; }

    // Relationship: optional catalog source. SetNull on delete so the
    // snapshot fields below survive the catalog entry being removed (D4).
    public int? PartId { get; set; }
    public Part? Part { get; set; }

    // Relationship: optional catalog source, same SetNull rationale (D5).
    public int? LaborTypeId { get; set; }
    public LaborType? LaborType { get; set; }

    [MaxLength(120)]
    public required string Description { get; set; }

    // numeric(18,2): parts count in whole units, labor counts in hours,
    // where a quarter- or half-hour (0.25, 0.50) is real service data (D20).
    public required decimal Quantity { get; set; }

    // Net unit price for a part line, or the net hourly rate snapshot for a
    // labor line (D4, D5).
    public required decimal NetUnitPrice { get; set; }

    public required int VatRatePercent { get; set; }

    // Stored line amounts, computed by Pricing/QuoteLineCalculator. Never
    // recomputed ad hoc elsewhere; the parent quote's totals are guarded by
    // AutoServiceDbContext.ValidateQuoteTotals.
    public decimal NetAmount { get; set; }
    public decimal VatAmount { get; set; }
    public decimal GrossAmount { get; set; }

    // Server-assigned display order (D41): max(existing) + 1 on insert, and
    // never accepted from a request DTO, so it is not a constructor
    // parameter either. Use AssignSortOrder to set it.
    public int SortOrder { get; private set; }

    /**
     * Parameterless constructor required by EF Core.
     */
    public QuoteLine() {}

    /**
     * Creates a quote line with its snapshot fields and computed amounts.
     *
     * @param lineKind Whether this is a part or a labor line.
     * @param description Short line description, snapshotted from the catalog or entered manually.
     * @param quantity Line quantity (units for parts, hours for labor).
     * @param netUnitPrice Net unit price, or net hourly rate for a labor line.
     * @param vatRatePercent VAT rate percentage applied to this line.
     * @param netAmount Computed net amount (Pricing/QuoteLineCalculator).
     * @param vatAmount Computed VAT amount (Pricing/QuoteLineCalculator).
     * @param grossAmount Computed gross amount (Pricing/QuoteLineCalculator).
     * @param partId Optional part catalog reference.
     * @param laborTypeId Optional labor type catalog reference.
     */
    [SetsRequiredMembers]
    public QuoteLine(
        QuoteLineKind lineKind,
        string description,
        decimal quantity,
        decimal netUnitPrice,
        int vatRatePercent,
        decimal netAmount,
        decimal vatAmount,
        decimal grossAmount,
        int? partId = null,
        int? laborTypeId = null)
    {
        LineKind = lineKind;
        Description = description;
        Quantity = quantity;
        NetUnitPrice = netUnitPrice;
        VatRatePercent = vatRatePercent;
        NetAmount = netAmount;
        VatAmount = vatAmount;
        GrossAmount = grossAmount;
        PartId = partId;
        LaborTypeId = laborTypeId;
    }

    /**
     * Assigns the server-computed display order for this line (D41).
     *
     * @param sortOrder The new sort order value (max existing + 1 on insert).
     */
    public void AssignSortOrder(int sortOrder)
    {
        SortOrder = sortOrder;
    }
}

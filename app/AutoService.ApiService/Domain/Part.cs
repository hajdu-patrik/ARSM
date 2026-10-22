using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.CodeAnalysis;
using AutoService.ApiService.Data;

namespace AutoService.ApiService.Domain;

/** Part catalog entry. Prices are net; VAT is applied at display and quote time. */
public class Part : IVersioned
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; private set; }

    [MaxLength(40)]
    public required string PartNumber { get; set; }

    [MaxLength(120)]
    public required string Name { get; set; }

    public required decimal NetUnitPrice { get; set; }

    // Int, not enum (multiplied into a price, not a category); allowed set and
    // check constraint documented in app/AutoService.ApiService/CLAUDE.md Catalog Anchors.
    public required int VatRatePercent { get; set; }

    // Optimistic-concurrency token mapped to Postgres xmin (Data/OptimisticConcurrency), not a real column.
    public uint Version { get; private set; }

    /** Parameterless constructor required by EF Core. */
    public Part() {}

    /** Creates a part with required catalog fields. */
    [SetsRequiredMembers]
    public Part(
        string partNumber,
        string name,
        decimal netUnitPrice,
        int vatRatePercent)
    {
        PartNumber = partNumber;
        Name = name;
        NetUnitPrice = netUnitPrice;
        VatRatePercent = vatRatePercent;
    }
}

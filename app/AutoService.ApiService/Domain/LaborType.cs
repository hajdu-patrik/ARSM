using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.CodeAnalysis;

namespace AutoService.ApiService.Domain;

/** Labor type catalog entry. Rates are net; VAT is applied at display and quote time. */
public class LaborType
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; private set; }

    [MaxLength(40)]
    public required string Code { get; set; }

    [MaxLength(120)]
    public required string Name { get; set; }

    public required decimal HourlyNetRate { get; set; }

    // Int, not enum (multiplied into a rate, not a category); allowed set and
    // check constraint documented in app/AutoService.ApiService/CLAUDE.md Catalog Anchors.
    public required int VatRatePercent { get; set; }

    /** Parameterless constructor required by EF Core. */
    public LaborType() {}

    /** Creates a labor type with required catalog fields. */
    [SetsRequiredMembers]
    public LaborType(
        string code,
        string name,
        decimal hourlyNetRate,
        int vatRatePercent)
    {
        Code = code;
        Name = name;
        HourlyNetRate = hourlyNetRate;
        VatRatePercent = vatRatePercent;
    }
}

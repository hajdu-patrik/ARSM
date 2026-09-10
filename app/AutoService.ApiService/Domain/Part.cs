using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.CodeAnalysis;

namespace AutoService.ApiService.Domain;

/**
 * Part catalog entry. Prices are net; VAT is applied at display and quote time.
 */
public class Part
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; private set; }

    [MaxLength(40)]
    public required string PartNumber { get; set; }

    [MaxLength(120)]
    public required string Name { get; set; }

    public required decimal NetUnitPrice { get; set; }

    // VatRatePercent is an int, not an enum: it is a number multiplied into a price,
    // not a behavioral category, so it would need to be unwrapped before every
    // calculation if it were an enum. A check constraint restricts it to the
    // allowed set (0, 5, 18, 27) instead.
    public required int VatRatePercent { get; set; }

    /**
     * Parameterless constructor required by EF Core.
     */
    public Part() {}

    /**
     * Creates a part with required catalog fields.
     *
     * @param partNumber Unique part number.
     * @param name Part display name.
     * @param netUnitPrice Net unit price.
     * @param vatRatePercent VAT rate percentage applied to this part.
     */
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

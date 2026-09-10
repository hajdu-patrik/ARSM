using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.CodeAnalysis;

namespace AutoService.ApiService.Domain;

/**
 * Labor type catalog entry. Rates are net; VAT is applied at display and quote time.
 */
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

    // VatRatePercent is an int, not an enum: it is a number multiplied into a rate,
    // not a behavioral category, so it would need to be unwrapped before every
    // calculation if it were an enum. A check constraint restricts it to the
    // allowed set (0, 5, 18, 27) instead.
    public required int VatRatePercent { get; set; }

    /**
     * Parameterless constructor required by EF Core.
     */
    public LaborType() {}

    /**
     * Creates a labor type with required catalog fields.
     *
     * @param code Unique labor type code.
     * @param name Labor type display name.
     * @param hourlyNetRate Net hourly rate.
     * @param vatRatePercent VAT rate percentage applied to this labor type.
     */
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

namespace AutoService.ApiService.Reporting;

public static partial class CompanyResultEndpoints
{
    /** One status row of the report: how many quotes it holds and what they are worth. */
    internal sealed record CompanyResultStatusRowDto(
        int QuoteCount,
        decimal Net,
        decimal Gross);

    /** One month of the yearly breakdown; months without a quote are present with zeros. */
    internal sealed record CompanyResultMonthDto(
        int Month,
        int AcceptedQuoteCount,
        decimal AcceptedNet,
        decimal AcceptedGross);

    /** Tax base and tax charged at one VAT rate, across the accepted quotes. */
    internal sealed record CompanyResultVatRowDto(
        int VatRatePercent,
        decimal Net,
        decimal Vat);

    /** Parts against labor within the accepted quotes. */
    internal sealed record CompanyResultLineKindRowDto(
        string LineKind,
        decimal Net,
        decimal Gross);

    /**
     * Revenue report for one period.
     *
     * A quote belongs to the month it was created in, whatever its status is
     * today (D17): the monthly figures then add up to the yearly one, and a
     * past month's number never changes because an old quote was accepted now.
     *
     * Sent is split in two (D25): a quote still inside its validity is pending
     * and may yet arrive, while an expired one will not. Draft is in no row at
     * all, because it never reached the customer; only its count is reported.
     */
    internal sealed record CompanyResultDto(
        int Year,
        int? Month,
        CompanyResultStatusRowDto Accepted,
        CompanyResultStatusRowDto Pending,
        CompanyResultStatusRowDto Expired,
        CompanyResultStatusRowDto Rejected,
        int DraftQuoteCount,
        IReadOnlyList<CompanyResultLineKindRowDto> AcceptedByLineKind,
        IReadOnlyList<CompanyResultMonthDto> Months,
        IReadOnlyList<CompanyResultVatRowDto> AcceptedVatBreakdown);
}

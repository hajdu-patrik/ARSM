namespace AutoService.ApiService.Quotes;

public static partial class QuoteEndpoints
{
    /** Error code body for machine-readable conflict responses (D30, D38), the Appointments.Contracts.cs convention. */
    internal sealed record ErrorCodeResponse(string Code);

    /** Minimal vehicle identification for a quote's anchor (D1). */
    internal sealed record QuoteVehicleSummaryDto(
        int Id,
        string LicensePlate,
        string Brand,
        string Model);

    /** Creating-mechanic summary (D15); null when the mechanic has since been removed (SetNull). */
    internal sealed record QuoteMechanicSummaryDto(
        int Id,
        string FullName);

    /** A single part or labor line, with the snapshotted description/price/VAT and the computed amounts. */
    internal sealed record QuoteLineDto(
        int Id,
        string LineKind,
        int? PartId,
        int? LaborTypeId,
        string Description,
        decimal Quantity,
        decimal NetUnitPrice,
        int VatRatePercent,
        decimal NetAmount,
        decimal VatAmount,
        decimal GrossAmount,
        int SortOrder);

    /** List-row projection: no Lines, IsExpired computed (D7), Version for optimistic concurrency (D30). */
    internal sealed record QuoteListItemDto(
        int Id,
        string QuoteNumber,
        string Title,
        string Status,
        bool IsExpired,
        DateTime CreatedAt,
        DateTime ValidUntil,
        decimal TotalNet,
        decimal TotalVat,
        decimal TotalGross,
        int VehicleId,
        QuoteVehicleSummaryDto Vehicle,
        int? AppointmentId,
        QuoteMechanicSummaryDto? CreatedByMechanic,
        uint Version);

    /** Full detail projection with lines and totals for GET /api/quotes/{id} and every write endpoint's response. */
    internal sealed record QuoteDetailDto(
        int Id,
        string QuoteNumber,
        string Title,
        string? Notes,
        string Status,
        bool IsExpired,
        DateTime CreatedAt,
        DateTime ValidUntil,
        DateTime? SentAt,
        DateTime? DecidedAt,
        decimal TotalNet,
        decimal TotalVat,
        decimal TotalGross,
        int VehicleId,
        QuoteVehicleSummaryDto Vehicle,
        int? AppointmentId,
        QuoteMechanicSummaryDto? CreatedByMechanic,
        IReadOnlyList<QuoteLineDto> Lines,
        uint Version);

    /** Draft-creation payload; ValidUntil defaults server-side to +30 days when omitted (D22). */
    internal sealed record CreateQuoteRequest(
        string Title,
        string? Notes,
        DateTime? ValidUntil,
        int? AppointmentId);

    /** Header-edit payload, Draft only; ValidUntil is intentionally absent (its own endpoint, D23). */
    internal sealed record UpdateQuoteRequest(
        string Title,
        string? Notes,
        uint Version);

    /** Unified line create payload (D40): optional catalog id plus optional override fields. */
    internal sealed record CreateQuoteLineRequest(
        string LineKind,
        decimal Quantity,
        int? PartId,
        int? LaborTypeId,
        string? Description,
        decimal? NetUnitPrice,
        int? VatRatePercent,
        uint Version);

    /** Unified line update payload (D40), same shape as create. */
    internal sealed record UpdateQuoteLineRequest(
        string LineKind,
        decimal Quantity,
        int? PartId,
        int? LaborTypeId,
        string? Description,
        decimal? NetUnitPrice,
        int? VatRatePercent,
        uint Version);

    /** Status transition payload (D7). */
    internal sealed record ChangeQuoteStatusRequest(
        string Status,
        uint Version);

    /** Validity-extension payload (D22, D23). */
    internal sealed record ExtendQuoteValidityRequest(
        DateTime ValidUntil,
        uint Version);
}

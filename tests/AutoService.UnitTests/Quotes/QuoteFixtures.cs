using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Pricing;
using AutoService.UnitTests.Http;

namespace AutoService.UnitTests.Quotes;

/** In-memory quotes, lines and appointments with consistent stored amounts. */
internal static class QuoteFixtures
{
    internal static readonly DateTime Now = new(2026, 10, 30, 12, 0, 0, DateTimeKind.Utc);

    internal static Customer NewCustomer() =>
        PrivateStatic.WithId(new Customer(new FullName("Anna", "Mária", "Kovács"), "anna@example.test", "+36201234567"), 7);

    internal static Vehicle NewVehicle() => PrivateStatic.WithId(
        new Vehicle("ABC-123", "WVWZZZAUZJW123456", "Škoda", "Octavia", 2018, 120000, 85, DrivetrainType.Diesel)
        {
            Customer = NewCustomer(),
        },
        3);

    internal static Mechanic NewMechanic() => PrivateStatic.WithId(
        new Mechanic(new FullName("Béla", null, "Szabó"), "bela@example.test", null, SpecializationType.All, [ExpertiseType.Engine]),
        5);

    internal static Quote NewQuote(
        QuoteStatus status = QuoteStatus.Draft,
        DateTime? validUntil = null,
        Appointment? appointment = null,
        Mechanic? mechanic = null)
    {
        var quote = PrivateStatic.WithId(
            new Quote("Olajcsere", "Megjegyzés", validUntil ?? Now.AddDays(30), 3, appointment is null ? null : 11, mechanic?.Id)
            {
                QuoteNumber = "ARSM-2026-0001",
                Status = status,
                Vehicle = NewVehicle(),
                CreatedByMechanic = mechanic,
                Appointment = appointment,
                CreatedAt = Now.AddDays(-1),
            },
            9);
        appointment?.Quotes.Add(quote);
        return quote;
    }

    internal static Appointment NewAppointment(ProgressStatus status) =>
        PrivateStatic.WithId(new Appointment { TaskDescription = "Service", Status = status }, 11);

    internal static QuoteLine NewLine(
        QuoteLineKind kind,
        string description,
        decimal quantity,
        decimal netUnitPrice,
        int vatRatePercent,
        int sortOrder,
        int? partId = null,
        int? laborTypeId = null)
    {
        var amounts = QuoteLineCalculator.Calculate(quantity, netUnitPrice, vatRatePercent);
        var line = new QuoteLine(
            kind, description, quantity, netUnitPrice, vatRatePercent,
            amounts.NetAmount, amounts.VatAmount, amounts.GrossAmount, partId, laborTypeId);
        line.AssignSortOrder(sortOrder);
        return line;
    }
}

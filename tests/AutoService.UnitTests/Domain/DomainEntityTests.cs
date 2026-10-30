using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.UnitTests.Domain;

/** Constructors and defaults of the entities the endpoints build: snapshots, status defaults, name formatting. */
public sealed class DomainEntityTests
{
    private static readonly DateTime ValidUntil = new(2026, 12, 31, 0, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void QuoteLine_constructor_keeps_the_snapshot_and_the_stored_amounts()
    {
        var line = new QuoteLine(QuoteLineKind.Part, "Szűrő", 2m, 1000m, 27, 2000m, 540m, 2540m, partId: 4);

        Assert.Equal(QuoteLineKind.Part, line.LineKind);
        Assert.Equal(("Szűrő", 2m, 1000m, 27), (line.Description, line.Quantity, line.NetUnitPrice, line.VatRatePercent));
        Assert.Equal((2000m, 540m, 2540m), (line.NetAmount, line.VatAmount, line.GrossAmount));
        Assert.Equal(4, line.PartId);
        Assert.Null(line.LaborTypeId);
    }

    [Fact]
    public void QuoteLine_labor_line_carries_the_labor_type_and_no_part()
    {
        var line = new QuoteLine(QuoteLineKind.Labor, "Munka", 1.5m, 9000m, 27, 13500m, 3645m, 17145m, laborTypeId: 8);

        Assert.Null(line.PartId);
        Assert.Equal(8, line.LaborTypeId);
    }

    [Fact]
    public void QuoteLine_sort_order_starts_at_zero_and_only_AssignSortOrder_sets_it()
    {
        var line = new QuoteLine(QuoteLineKind.Part, "x", 1m, 1m, 5, 1m, 0.05m, 1.05m);
        Assert.Equal(0, line.SortOrder);

        line.AssignSortOrder(7);

        Assert.Equal(7, line.SortOrder);
        Assert.False(typeof(QuoteLine).GetProperty(nameof(QuoteLine.SortOrder))!.SetMethod!.IsPublic);
    }

    [Fact]
    public void Part_and_LaborType_constructors_copy_their_catalog_fields()
    {
        var part = new Part("OLF-1001", "Olajszűrő", 4500m, 27);
        var labor = new LaborType("OLAJCSERE", "Olajcsere", 9000m, 18);

        Assert.Equal(("OLF-1001", "Olajszűrő", 4500m, 27), (part.PartNumber, part.Name, part.NetUnitPrice, part.VatRatePercent));
        Assert.Equal(("OLAJCSERE", "Olajcsere", 9000m, 18), (labor.Code, labor.Name, labor.HourlyNetRate, labor.VatRatePercent));
        Assert.Equal(0u, part.Version);
        Assert.Equal(0u, labor.Version);
    }

    [Fact]
    public void Quote_starts_as_a_draft_with_an_empty_number_and_no_lines()
    {
        var quote = new Quote("Olajcsere", "megjegyzés", ValidUntil, 3, 11, 5);

        Assert.Equal(QuoteStatus.Draft, quote.Status);
        Assert.Equal(string.Empty, quote.QuoteNumber);
        Assert.Empty(quote.Lines);
        Assert.Equal((3, (int?)11, (int?)5), (quote.VehicleId, quote.AppointmentId, quote.CreatedByMechanicId));
        Assert.Equal((0m, 0m, 0m), (quote.TotalNet, quote.TotalVat, quote.TotalGross));
        Assert.Null(quote.SentAt);
        Assert.Null(quote.DecidedAt);
        Assert.Equal(DateTimeKind.Utc, quote.CreatedAt.Kind);
    }

    [Fact]
    public void Quote_without_appointment_or_author_keeps_both_links_null()
    {
        var quote = new Quote("T", null, ValidUntil, 3, null, null);

        Assert.Null(quote.AppointmentId);
        Assert.Null(quote.CreatedByMechanicId);
        Assert.Null(quote.Notes);
    }

    [Fact]
    public void Appointment_starts_in_progress_with_an_utc_intake_time_and_no_end_stamps()
    {
        var before = DateTime.UtcNow;
        var appointment = new Appointment { TaskDescription = "Service" };

        Assert.Equal(ProgressStatus.InProgress, appointment.Status);
        Assert.InRange(appointment.IntakeCreatedAt, before, DateTime.UtcNow);
        Assert.Null(appointment.CompletedAt);
        Assert.Null(appointment.CanceledAt);
        Assert.Empty(appointment.Mechanics);
        Assert.Empty(appointment.Quotes);
    }

    [Fact]
    public void Vehicle_constructor_copies_every_specification_field()
    {
        var vehicle = new Vehicle("ABC-123", "WVWZZZAUZJW123456", "Škoda", "Octavia", 2018, 120000, 85, DrivetrainType.PHEV);

        Assert.Equal(("ABC-123", "WVWZZZAUZJW123456", "Škoda", "Octavia"), (vehicle.LicensePlate, vehicle.Vin, vehicle.Brand, vehicle.Model));
        Assert.Equal((2018, 120000, 85, DrivetrainType.PHEV), (vehicle.Year, vehicle.MileageKm, vehicle.EnginePowerKw, vehicle.DrivetrainType));
    }

    [Fact]
    public void Customer_has_no_identity_link_and_starts_without_vehicles()
    {
        var customer = new Customer(new FullName("Anna", null, "Kovács"), "anna@example.test", "+36201234567");

        Assert.Null(customer.IdentityUserId);
        Assert.Null(customer.TokensValidAfter);
        Assert.Empty(customer.Vehicles);
        Assert.Equal("+36201234567", customer.PhoneNumber);
    }

    [Theory]
    [InlineData("Anna", null, "Kovács", "Anna Kovács")]
    [InlineData("Anna", "", "Kovács", "Anna Kovács")]
    [InlineData("Anna", "  ", "Kovács", "Anna Kovács")]
    [InlineData("Anna", "Mária", "Kovács", "Anna Mária Kovács")]
    public void FullName_ToString_skips_a_blank_middle_name(string first, string? middle, string last, string expected)
    {
        Assert.Equal(expected, new FullName(first, middle, last).ToString());
    }
}

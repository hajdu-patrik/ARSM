using System.Linq.Expressions;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Lifecycle;
using AutoService.ApiService.Quotes;
using AutoService.UnitTests.Http;

namespace AutoService.UnitTests.Quotes;

/** The SQL list projection must agree with the lifecycle rules and the detail mapping for every combination. */
public sealed class QuoteListProjectionTests
{
    private static Func<Quote, QuoteEndpoints.QuoteListItemDto> Projection() =>
        PrivateStatic
            .Call<Expression<Func<Quote, QuoteEndpoints.QuoteListItemDto>>>(typeof(QuoteEndpoints), "QuoteListItemProjection", QuoteFixtures.Now)
            .Compile();

    private static Quote Build(QuoteStatus status, ProgressStatus? appointmentStatus, bool acceptedSibling)
    {
        var appointment = appointmentStatus is null ? null : QuoteFixtures.NewAppointment(appointmentStatus.Value);
        var quote = QuoteFixtures.NewQuote(status, QuoteFixtures.Now.AddDays(5), appointment);
        if (acceptedSibling && appointment is not null)
        {
            appointment.Quotes.Add(QuoteFixtures.NewQuote(QuoteStatus.Accepted));
        }

        return quote;
    }

    [Fact]
    public void Lock_reason_is_locked_flag_and_delete_flag_match_the_lifecycle_rules_in_every_case()
    {
        var project = Projection();
        var mismatches = new List<string>();
        ProgressStatus?[] appointmentStates = [null, ProgressStatus.InProgress, ProgressStatus.Completed, ProgressStatus.Cancelled];

        foreach (var status in Enum.GetValues<QuoteStatus>())
        {
            foreach (var appointmentStatus in appointmentStates)
            {
                foreach (var acceptedSibling in new[] { false, true })
                {
                    var quote = Build(status, appointmentStatus, acceptedSibling);
                    var hasAccepted = quote.Appointment?.Quotes.Any(q => q.Status == QuoteStatus.Accepted) ?? false;
                    var expectedReason = quote.Appointment is null
                        ? null
                        : AppointmentQuoteLifecycle.ResolveQuoteLockReason(appointmentStatus, hasAccepted);
                    var expectedDelete = AppointmentQuoteLifecycle.CanDeleteQuote(status, appointmentStatus);

                    var dto = project(quote);
                    if (dto.LockReason != expectedReason
                        || dto.IsLocked != (expectedReason is not null)
                        || dto.CanDelete != expectedDelete)
                    {
                        mismatches.Add($"{status}/{appointmentStatus}/accepted={acceptedSibling}");
                    }
                }
            }
        }

        Assert.Empty(mismatches);
    }

    [Fact]
    public void Row_fields_match_the_quote_and_expiry_follows_the_sent_deadline_rule()
    {
        var mechanic = QuoteFixtures.NewMechanic();
        var sent = QuoteFixtures.NewQuote(QuoteStatus.Sent, QuoteFixtures.Now.AddDays(-1), mechanic: mechanic);
        sent.TotalNet = 100m;
        sent.TotalVat = 27m;
        sent.TotalGross = 127m;

        var dto = Projection()(sent);

        Assert.Equal(("ARSM-2026-0001", "Olajcsere", "Sent", true), (dto.QuoteNumber, dto.Title, dto.Status, dto.IsExpired));
        Assert.Equal((100m, 27m, 127m), (dto.TotalNet, dto.TotalVat, dto.TotalGross));
        Assert.Equal(new QuoteEndpoints.QuoteMechanicSummaryDto(5, "Béla Szabó"), dto.CreatedByMechanic);
        Assert.Equal(new QuoteEndpoints.QuoteVehicleSummaryDto(3, "ABC-123", "Škoda", "Octavia"), dto.Vehicle);
        Assert.Null(dto.AppointmentId);
    }

    [Fact]
    public void A_quote_whose_mechanic_was_removed_has_no_creator_summary()
    {
        Assert.Null(Projection()(QuoteFixtures.NewQuote()).CreatedByMechanic);
    }

    [Fact]
    public void The_projection_and_the_detail_mapping_agree_on_expiry()
    {
        var project = Projection();

        foreach (var status in Enum.GetValues<QuoteStatus>())
        {
            var quote = QuoteFixtures.NewQuote(status, QuoteFixtures.Now.AddHours(-1));
            var detail = PrivateStatic.Call<QuoteEndpoints.QuoteDetailDto>(
                typeof(QuoteEndpoints), "ToQuoteDetailDto", quote, QuoteFixtures.Now, (string?)null);

            Assert.Equal(detail.IsExpired, project(quote).IsExpired);
        }
    }
}

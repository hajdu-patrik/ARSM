using System.Linq.Expressions;
using System.Reflection;
using AutoService.ApiService.Appointments;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.UnitTests.Http;
using AutoService.UnitTests.Quotes;

namespace AutoService.UnitTests.Appointments;

/** The appointment DTO from a loaded entity equals the SQL projection, and the history order is deterministic. */
public sealed class AppointmentMappingTests
{
    private static Appointment Build(ProgressStatus status, bool acceptedQuote)
    {
        var appointment = QuoteFixtures.NewAppointment(status);
        appointment.Vehicle = QuoteFixtures.NewVehicle();
        appointment.Vehicle.CustomerId = 7;
        var withPicture = QuoteFixtures.NewMechanic();
        withPicture.ProfilePictureObjectKey = "profiles/5.webp";
        var contentTypeOnly = PrivateStatic.WithId(
            new Mechanic(new FullName("Cili", "Mária", "Nagy"), "cili@example.test", null, SpecializationType.HybridAndElectric, [ExpertiseType.Brakes]),
            6);
        contentTypeOnly.ProfilePictureContentType = "image/webp";
        var plain = PrivateStatic.WithId(
            new Mechanic(new FullName("Dani", null, "Kis"), "dani@example.test", null, SpecializationType.GasolineAndDiesel, [ExpertiseType.Engine]),
            8);
        appointment.Mechanics.AddRange([withPicture, contentTypeOnly, plain]);
        appointment.Quotes.Add(new Quote("T", null, QuoteFixtures.Now, 1, null, null) { Status = QuoteStatus.Sent });
        if (acceptedQuote)
        {
            appointment.Quotes.Add(new Quote("T2", null, QuoteFixtures.Now, 1, null, null) { Status = QuoteStatus.Accepted });
        }

        return appointment;
    }

    private static AppointmentEndpoints.AppointmentDto FromEntity(Appointment appointment) =>
        PrivateStatic.Call<AppointmentEndpoints.AppointmentDto>(typeof(AppointmentEndpoints), "ToDto", appointment);

    private static AppointmentEndpoints.AppointmentDto FromProjection(Appointment appointment)
    {
        var field = typeof(AppointmentEndpoints).GetField("AppointmentDtoProjection", BindingFlags.NonPublic | BindingFlags.Static)!;
        var projection = (Expression<Func<Appointment, AppointmentEndpoints.AppointmentDto>>)field.GetValue(null)!;
        return projection.Compile()(appointment);
    }

    [Fact]
    public void The_entity_dto_carries_the_schedule_vehicle_and_mechanic_summaries()
    {
        var dto = FromEntity(Build(ProgressStatus.InProgress, acceptedQuote: false));

        Assert.Equal(("Service", "InProgress"), (dto.TaskDescription, dto.Status));
        Assert.Equal(new AppointmentEndpoints.VehicleDto(3, "ABC-123", "WVWZZZAUZJW123456", "Škoda", "Octavia", 2018, 120000, 85, "Diesel", 7), dto.Vehicle);
        Assert.Equal(
            new[]
            {
                new AppointmentEndpoints.MechanicSummaryDto(5, "Béla Szabó", "All", true),
                new AppointmentEndpoints.MechanicSummaryDto(6, "Cili Mária Nagy", "HybridAndElectric", true),
                new AppointmentEndpoints.MechanicSummaryDto(8, "Dani Kis", "GasolineAndDiesel", false),
            },
            dto.Mechanics);
    }

    [Fact]
    public void The_lifecycle_flags_follow_status_and_accepted_quote()
    {
        var open = FromEntity(Build(ProgressStatus.InProgress, acceptedQuote: false));
        var ready = FromEntity(Build(ProgressStatus.InProgress, acceptedQuote: true));
        var done = FromEntity(Build(ProgressStatus.Completed, acceptedQuote: true));

        Assert.Equal((false, false, true, true), (open.HasAcceptedQuote, open.CanComplete, open.CanDelete, open.CanLinkQuote));
        Assert.Equal((true, true, true, false), (ready.HasAcceptedQuote, ready.CanComplete, ready.CanDelete, ready.CanLinkQuote));
        Assert.Equal((true, false, false, false), (done.HasAcceptedQuote, done.CanComplete, done.CanDelete, done.CanLinkQuote));
    }

    [Fact]
    public void The_sql_projection_and_the_entity_mapping_agree_for_every_status_and_quote_state()
    {
        var mismatches = new List<string>();

        foreach (var status in Enum.GetValues<ProgressStatus>())
        {
            foreach (var accepted in new[] { false, true })
            {
                var appointment = Build(status, accepted);
                var entity = FromEntity(appointment);
                var projected = FromProjection(appointment);

                var same = entity.Status == projected.Status
                    && entity.Vehicle == projected.Vehicle
                    && entity.Mechanics.SequenceEqual(projected.Mechanics)
                    && (entity.HasAcceptedQuote, entity.CanComplete, entity.CanDelete, entity.CanLinkQuote)
                        == (projected.HasAcceptedQuote, projected.CanComplete, projected.CanDelete, projected.CanLinkQuote);
                if (!same)
                {
                    mismatches.Add($"{status}/accepted={accepted}");
                }
            }
        }

        Assert.Empty(mismatches);
    }

    private static List<int> History(bool? descending)
    {
        var dates = new[] { new DateTime(2026, 11, 2), new DateTime(2026, 11, 1), new DateTime(2026, 11, 1), new DateTime(2026, 11, 3) };
        var appointments = dates
            .Select((date, index) =>
            {
                var appointment = QuoteFixtures.NewAppointment(ProgressStatus.InProgress);
                appointment.ScheduledDate = date;
                return PrivateStatic.WithId(appointment, index + 1);
            })
            .ToList();

        var ordered = PrivateStatic.Call<IOrderedQueryable<Appointment>>(
            typeof(AppointmentEndpoints), "OrderHistory", appointments.AsQueryable(), descending);
        return ordered.Select(a => a.Id).ToList();
    }

    [Theory]
    [InlineData(null)]
    [InlineData(false)]
    public void History_is_ascending_by_scheduled_date_with_the_id_as_tie_breaker(bool? descending)
    {
        Assert.Equal(new[] { 2, 3, 1, 4 }, History(descending));
    }

    [Fact]
    public void History_descending_reverses_the_date_and_the_tie_breaker()
    {
        Assert.Equal(new[] { 4, 1, 3, 2 }, History(descending: true));
    }
}

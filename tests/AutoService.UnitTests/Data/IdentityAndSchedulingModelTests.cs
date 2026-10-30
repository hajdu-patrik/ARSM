using AutoService.ApiService.Domain;
using AutoService.ApiService.Security;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace AutoService.UnitTests.Data;

/** The people, token, vehicle and appointment mappings the migrations and the SQL suite rely on. */
public sealed class IdentityAndSchedulingModelTests : IDisposable
{
    private readonly AutoService.ApiService.Data.AutoServiceDbContext db = TestDbContextFactory.Create();

    public void Dispose() => db.Dispose();

    private IModel Model => db.Model;
    private IModel DesignTimeModel => db.GetService<IDesignTimeModel>().Model;

    [Fact]
    public void People_is_one_table_with_a_person_type_discriminator_for_customers_and_mechanics()
    {
        var people = Model.Entity<People>();

        Assert.Equal("people", people.GetTableName());
        Assert.Equal("PersonType", people.FindDiscriminatorProperty()!.Name);
        Assert.Equal("Customer", Model.Entity<Customer>().GetDiscriminatorValue());
        Assert.Equal("Mechanic", Model.Entity<Mechanic>().GetDiscriminatorValue());
        Assert.True(people.IsAbstract());
    }

    [Fact]
    public void People_email_identity_link_and_filtered_phone_are_unique_with_their_lengths()
    {
        var people = Model.Entity<People>();

        Assert.True(people.HasUniqueIndex("Email"));
        Assert.True(people.HasUniqueIndex("IdentityUserId"));
        Assert.True(people.HasUniqueIndex("PhoneNumber"));
        Assert.Equal("\"PhoneNumber\" IS NOT NULL", people.Index("PhoneNumber")!.GetFilter());
        Assert.Equal(150, people.Property("Email").GetMaxLength());
        Assert.False(people.Property("Email").IsNullable);
        Assert.Equal(450, people.Property("IdentityUserId").GetMaxLength());
        Assert.Equal(20, people.Property("PhoneNumber").GetMaxLength());
    }

    [Fact]
    public void The_profile_picture_columns_and_the_session_cutoff_are_mapped()
    {
        var people = Model.Entity<People>();

        Assert.Equal(256, people.Property("ProfilePictureObjectKey").GetMaxLength());
        Assert.Equal(80, people.Property("ProfilePictureETag").GetMaxLength());
        Assert.Equal(50, people.Property("ProfilePictureContentType").GetMaxLength());
        Assert.Equal("timestamp with time zone", people.Property("TokensValidAfter").GetColumnType());
        Assert.True(people.Property("TokensValidAfter").IsNullable);
    }

    [Fact]
    public void The_name_is_owned_with_required_first_and_last_columns_and_an_optional_middle_one()
    {
        var name = Model.Entity<People>().FindNavigation(nameof(People.Name))!.TargetEntityType;

        Assert.Equal("FirstName", name.Property("FirstName").GetColumnName());
        Assert.Equal("LastName", name.Property("LastName").GetColumnName());
        Assert.Equal("MiddleName", name.Property("MiddleName").GetColumnName());
        Assert.Equal(50, name.Property("FirstName").GetMaxLength());
        Assert.False(name.Property("FirstName").IsNullable);
        Assert.False(name.Property("LastName").IsNullable);
        Assert.True(name.Property("MiddleName").IsNullable);
    }

    [Fact]
    public void A_mechanic_stores_specialization_as_a_string_expertise_as_text_and_defaults_the_password_gate_to_false()
    {
        var mechanic = Model.Entity<Mechanic>();

        Assert.True(mechanic.Property("Specialization").IsStoredAsString(64));
        Assert.Equal(256, mechanic.Property("Expertise").GetMaxLength());
        Assert.False(mechanic.Property("Expertise").IsNullable);
        Assert.Equal(false, mechanic.Property("MustChangePassword").GetDefaultValue());
    }

    [Fact]
    public void Refresh_tokens_hold_a_unique_hash_a_mechanic_expiry_index_and_die_with_their_mechanic()
    {
        var tokens = Model.Entity<RefreshToken>();

        Assert.Equal("refreshtokens", tokens.GetTableName());
        Assert.True(tokens.HasUniqueIndex("TokenHash"));
        Assert.NotNull(tokens.Index("MechanicId", "ExpiresAtUtc"));
        Assert.Equal(128, tokens.Property("TokenHash").GetMaxLength());
        Assert.Equal(64, tokens.Property("CreatedByIpAddress").GetMaxLength());
        Assert.Equal(512, tokens.Property("CreatedByUserAgent").GetMaxLength());
        Assert.Equal(DeleteBehavior.Cascade, tokens.ForeignKey("MechanicId").DeleteBehavior);
    }

    [Fact]
    public void The_jwt_denylist_has_a_unique_jti_and_an_expiry_index_for_the_cleanup()
    {
        var revoked = Model.Entity<RevokedJwtToken>();

        Assert.Equal("revokedjwttokens", revoked.GetTableName());
        Assert.True(revoked.HasUniqueIndex("JwtId"));
        Assert.NotNull(revoked.Index("ExpiresAtUtc"));
        Assert.Equal(64, revoked.Property("JwtId").GetMaxLength());
    }

    [Fact]
    public void Vehicles_have_unique_plate_and_vin_and_the_string_drivetrain()
    {
        var vehicles = Model.Entity<Vehicle>();

        Assert.Equal("vehicles", vehicles.GetTableName());
        Assert.True(vehicles.HasUniqueIndex("LicensePlate"));
        Assert.True(vehicles.HasUniqueIndex("Vin"));
        Assert.Equal(20, vehicles.Property("LicensePlate").GetMaxLength());
        Assert.Equal(17, vehicles.Property("Vin").GetMaxLength());
        Assert.True(vehicles.Property("DrivetrainType").IsStoredAsString(16));
    }

    [Fact]
    public void Deleting_a_customer_cascades_to_vehicles_and_a_vehicle_to_its_appointments()
    {
        Assert.Equal(DeleteBehavior.Cascade, Model.Entity<Vehicle>().ForeignKey("CustomerId").DeleteBehavior);
        Assert.Equal(DeleteBehavior.Cascade, Model.Entity<Appointment>().ForeignKey("VehicleId").DeleteBehavior);
    }

    [Fact]
    public void Appointments_are_xmin_versioned_string_status_and_indexed_by_date_and_due_time()
    {
        var appointments = Model.Entity<Appointment>();

        Assert.Equal("appointments", appointments.GetTableName());
        Assert.True(appointments.Property("Version").IsXminVersion());
        Assert.True(appointments.Property("Status").IsStoredAsString(32));
        Assert.Equal(200, appointments.Property("TaskDescription").GetMaxLength());
        Assert.NotNull(appointments.Index("ScheduledDate"));
        Assert.NotNull(appointments.Index("DueDateTime"));
    }

    [Fact]
    public void The_appointment_mechanic_join_has_a_composite_key_and_cascades_from_both_sides()
    {
        var join = Model.GetEntityTypes().Single(entity => entity.GetTableName() == "appointmentmechanics");

        Assert.Equal(new[] { "AppointmentId", "MechanicId" }, join.FindPrimaryKey()!.Properties.Select(property => property.Name));
        Assert.Equal(DeleteBehavior.Cascade, join.ForeignKey("AppointmentId").DeleteBehavior);
        Assert.Equal(DeleteBehavior.Cascade, join.ForeignKey("MechanicId").DeleteBehavior);
    }

    [Fact]
    public void The_vehicle_and_mechanic_check_constraints_are_declared()
    {
        var checks = DesignTimeModel.CheckConstraints();

        Assert.Equal("\"Year\" >= 1886 AND \"Year\" <= 2100", checks["CK_Vehicles_Year"]);
        Assert.Equal("\"MileageKm\" >= 0", checks["CK_Vehicles_MileageKm"]);
        Assert.Equal("\"EnginePowerKw\" >= 0", checks["CK_Vehicles_EnginePowerKw"]);
        Assert.Equal("\"Vin\" ~ '^[A-HJ-NPR-Z0-9]{17}$'", checks["CK_Vehicles_Vin"]);
        Assert.Equal("\"Expertise\" <> ''", checks["CK_Mechanics_Expertise_NotEmpty"]);
    }
}

using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Data;

public sealed partial class AutoServiceDbContext
{
    /** Configures Vehicle and Appointment: check constraints, indexes, xmin version and the mechanic join table. */
    private void ConfigureSchedulingModel(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.ToTable("vehicles", table =>
            {
                table.HasCheckConstraint("CK_Vehicles_Year", "\"Year\" >= 1886 AND \"Year\" <= 2100");
                table.HasCheckConstraint("CK_Vehicles_MileageKm", "\"MileageKm\" >= 0");
                table.HasCheckConstraint("CK_Vehicles_EnginePowerKw", "\"EnginePowerKw\" >= 0");
                table.HasCheckConstraint("CK_Vehicles_Vin", "\"Vin\" ~ '^[A-HJ-NPR-Z0-9]{17}$'");
            });

            entity.HasIndex(v => v.LicensePlate).IsUnique();
            entity.HasIndex(v => v.Vin).IsUnique();

            entity.Property(x => x.LicensePlate).HasMaxLength(20).IsRequired();
            entity.Property(x => x.Vin).HasMaxLength(17).IsRequired();
            entity.Property(x => x.Brand).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Model).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Year).IsRequired();
            entity.Property(x => x.MileageKm).IsRequired();
            entity.Property(x => x.EnginePowerKw).IsRequired();
            entity.Property(x => x.DrivetrainType).HasConversion<string>().HasMaxLength(16).IsRequired();

            entity.HasMany(x => x.Appointments)
                  .WithOne(x => x.Vehicle)
                  .HasForeignKey(x => x.VehicleId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.ToTable("appointments");

            entity.Property(x => x.ScheduledDate).IsRequired();
            entity.Property(x => x.IntakeCreatedAt).IsRequired();
            entity.Property(x => x.DueDateTime).IsRequired();
            entity.Property(x => x.TaskDescription).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32).IsRequired();
            entity.Property(x => x.CompletedAt);
            entity.Property(x => x.CanceledAt);

            entity.HasIndex(x => x.ScheduledDate);
            entity.HasIndex(x => x.DueDateTime);
            entity.MapXminVersion();

            entity.HasMany(x => x.Mechanics)
                  .WithMany(x => x.Appointments)
                  .UsingEntity<Dictionary<string, object>>(
                    "appointmentmechanics",
                    j => j.HasOne<Mechanic>().WithMany().HasForeignKey("MechanicId").OnDelete(DeleteBehavior.Cascade),
                    j => j.HasOne<Appointment>().WithMany().HasForeignKey("AppointmentId").OnDelete(DeleteBehavior.Cascade),
                    j =>
                    {
                        j.ToTable("appointmentmechanics");
                        j.HasKey("AppointmentId", "MechanicId");
                    });
        });
    }
}

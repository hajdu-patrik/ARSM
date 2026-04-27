using AutoService.ApiService.Domain;
using AutoService.ApiService.Security;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Data;

/**
 * Entity Framework Core DbContext for the AutoService domain.
 */
public sealed class AutoServiceDbContext(DbContextOptions<AutoServiceDbContext> options) : IdentityDbContext<IdentityUser>(options)
{
    // Entity sets.
    public DbSet<People> People => Set<People>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Mechanic> Mechanics => Set<Mechanic>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<RevokedJwtToken> RevokedJwtTokens => Set<RevokedJwtToken>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Appointment> Appointments => Set<Appointment>();


    /** Configures entity mappings, constraints, and relationships. */
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Shared People mapping (base for Customer and Mechanic).
        modelBuilder.Entity<People>(entity =>
        {
            entity.ToTable("people");
            entity.HasDiscriminator<string>("PersonType")
                  .HasValue<Customer>("Customer")
                  .HasValue<Mechanic>("Mechanic");

            entity.Property(x => x.Email).HasMaxLength(150).IsRequired();
            entity.HasIndex(x => x.Email).IsUnique();
            entity.Property(x => x.IdentityUserId).HasMaxLength(450);
            entity.HasIndex(x => x.IdentityUserId).IsUnique();
            entity.Property(x => x.PhoneNumber).HasMaxLength(20);
            entity.Property(x => x.ProfilePicture).HasColumnName("ProfilePicture");
            entity.Property(x => x.ProfilePictureContentType).HasMaxLength(50).HasColumnName("ProfilePictureContentType");

            entity.OwnsOne(x => x.Name, name =>
            {
                name.Property(x => x.FirstName).HasMaxLength(50).HasColumnName("FirstName").IsRequired();
                name.Property(x => x.MiddleName).HasMaxLength(50).HasColumnName("MiddleName");
                name.Property(x => x.LastName).HasMaxLength(50).HasColumnName("LastName").IsRequired();
            });
        });

        // Customer mapping.
        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasMany(x => x.Vehicles)
                  .WithOne(x => x.Customer)
                  .HasForeignKey(x => x.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Mechanic mapping.
        modelBuilder.Entity<Mechanic>(entity =>
        {
            entity.ToTable(table =>
            {
                table.HasCheckConstraint("CK_Mechanics_Expertise_NotEmpty", "\"Expertise\" <> ''");
            });

            entity.Property(x => x.Specialization)
                  .HasConversion<string>()
                  .HasMaxLength(64)
                  .IsRequired();

            entity.Property(x => x.Expertise)
                  .HasConversion(
                    list => string.Join(',', list.Distinct().Select(x => x.ToString())),
                    value => string.IsNullOrWhiteSpace(value)
                        ? new List<ExpertiseType>()
                        : value
                            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                            .Select(Enum.Parse<ExpertiseType>)
                            .Distinct()
                            .ToList())
                  .Metadata.SetValueComparer(new ValueComparer<List<ExpertiseType>>(
                    (a, b) => a != null && b != null && a.SequenceEqual(b),
                    v => v.Aggregate(0, (hash, item) => HashCode.Combine(hash, item)),
                    v => v.ToList()));

            entity.Property(x => x.Expertise)
                  .HasMaxLength(256)
                  .IsRequired();
        });

        // Refresh token mapping.
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refreshtokens");

            entity.Property(x => x.TokenHash)
                .HasMaxLength(128)
                .IsRequired();

            entity.Property(x => x.CreatedByIpAddress)
                .HasMaxLength(64);

            entity.Property(x => x.CreatedByUserAgent)
                .HasMaxLength(512);

            entity.HasIndex(x => x.TokenHash)
                .IsUnique();

            entity.HasIndex(x => new { x.MechanicId, x.ExpiresAtUtc });

            entity.HasOne(x => x.Mechanic)
                .WithMany()
                .HasForeignKey(x => x.MechanicId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Access-token JWT denylist mapping.
        modelBuilder.Entity<RevokedJwtToken>(entity =>
        {
            entity.ToTable("revokedjwttokens");

            entity.Property(x => x.JwtId)
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(x => x.RevokedAtUtc)
                .IsRequired();

            entity.Property(x => x.ExpiresAtUtc)
                .IsRequired();

            entity.HasIndex(x => x.JwtId)
                .IsUnique();

            entity.HasIndex(x => x.ExpiresAtUtc);
        });

        // Vehicle mapping.
        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.ToTable("vehicles", table =>
            {
                table.HasCheckConstraint("CK_Vehicles_Year", "\"Year\" >= 1886 AND \"Year\" <= 2100");
                table.HasCheckConstraint("CK_Vehicles_MileageKm", "\"MileageKm\" >= 0");
                table.HasCheckConstraint("CK_Vehicles_EnginePowerHp", "\"EnginePowerHp\" >= 0");
                table.HasCheckConstraint("CK_Vehicles_EngineTorqueNm", "\"EngineTorqueNm\" >= 0");
            });

            entity.HasIndex(v => v.LicensePlate).IsUnique();

            entity.Property(x => x.LicensePlate).HasMaxLength(20).IsRequired();
            entity.Property(x => x.Brand).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Model).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Year).IsRequired();
            entity.Property(x => x.MileageKm).IsRequired();
            entity.Property(x => x.EnginePowerHp).IsRequired();
            entity.Property(x => x.EngineTorqueNm).IsRequired();

            entity.HasMany(x => x.Appointments)
                  .WithOne(x => x.Vehicle)
                  .HasForeignKey(x => x.VehicleId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Appointment mapping.
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

    /**
     * Validates mechanic expertise constraints before persisting changes.
     *
     * @param acceptAllChangesOnSuccess Indicates whether ChangeTracker.AcceptAllChanges() is called after save.
     * @return The number of state entries written to the database.
     */
    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ValidateMechanicExpertise();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    /**
     * Async variant of SaveChanges with mechanic expertise validation.
     *
     * @param acceptAllChangesOnSuccess Indicates whether ChangeTracker.AcceptAllChanges() is called after save.
     * @param cancellationToken A token to cancel the async operation.
     * @return A task containing the number of state entries written to the database.
     */
    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        ValidateMechanicExpertise();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    /**
     * Ensures each modified mechanic has 1..10 unique expertise values.
     *
     * @return No return value.
     */
    private void ValidateMechanicExpertise()
    {
        var mechanics = ChangeTracker
            .Entries<Mechanic>()
            .Where(x => x.State is EntityState.Added or EntityState.Modified)
            .Select(x => x.Entity);

        foreach (var mechanic in mechanics)
        {
            var expertise = mechanic.Expertise;

            if (expertise.Count is < 1 or > 10)
            {
                throw new InvalidOperationException("A mechanic expertise list must contain at least 1 and at most 10 items.");
            }

            if (expertise.Distinct().Count() != expertise.Count)
            {
                throw new InvalidOperationException("A mechanic expertise list cannot contain duplicate items.");
            }
        }
    }
}
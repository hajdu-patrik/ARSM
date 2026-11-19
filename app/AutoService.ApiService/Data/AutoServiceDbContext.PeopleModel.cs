using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace AutoService.ApiService.Data;

public sealed partial class AutoServiceDbContext
{
    /** Configures the People TPH hierarchy (Customer, Mechanic): columns, indexes and the expertise conversion. */
    private void ConfigurePeopleModel(ModelBuilder modelBuilder)
    {
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
            // Login resolves a phone with FirstOrDefault, so the database, not the handlers' pre-checks, must keep it unique.
            entity.HasIndex(x => x.PhoneNumber).IsUnique().HasFilter("\"PhoneNumber\" IS NOT NULL");
            entity.Property(x => x.ProfilePictureObjectKey).HasMaxLength(256).HasColumnName("ProfilePictureObjectKey");
            entity.Property(x => x.ProfilePictureETag).HasMaxLength(80).HasColumnName("ProfilePictureETag");
            entity.Property(x => x.ProfilePictureContentType).HasMaxLength(50).HasColumnName("ProfilePictureContentType");
            entity.Property(x => x.TokensValidAfter).HasColumnName("TokensValidAfter").HasColumnType("timestamp with time zone");

            entity.OwnsOne(x => x.Name, name =>
            {
                name.Property(x => x.FirstName).HasMaxLength(50).HasColumnName("FirstName").IsRequired();
                name.Property(x => x.MiddleName).HasMaxLength(50).HasColumnName("MiddleName");
                name.Property(x => x.LastName).HasMaxLength(50).HasColumnName("LastName").IsRequired();
            });
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasMany(x => x.Vehicles)
                  .WithOne(x => x.Customer)
                  .HasForeignKey(x => x.CustomerId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

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

            // TPH: the column is shared with customer rows, so it defaults to false instead of allowing null.
            entity.Property(x => x.MustChangePassword).HasDefaultValue(false);
        });
    }
}

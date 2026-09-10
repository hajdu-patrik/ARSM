using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Data;

public sealed partial class AutoServiceDbContext
{
    /**
     * Configures the pricing catalog entities (Part, LaborType): table names,
     * money-column precision, VAT-rate/amount check constraints, and unique indexes.
     *
     * @param modelBuilder Model builder passed in from OnModelCreating.
     */
    private void ConfigurePricingModel(ModelBuilder modelBuilder)
    {
        // Part mapping.
        modelBuilder.Entity<Part>(entity =>
        {
            entity.ToTable("parts", table =>
            {
                table.HasCheckConstraint("CK_Parts_NetUnitPrice", "\"NetUnitPrice\" >= 0 AND \"NetUnitPrice\" <= 100000000");
                table.HasCheckConstraint("CK_Parts_VatRate", "\"VatRatePercent\" IN (0,5,18,27)");
            });

            entity.HasIndex(x => x.PartNumber).IsUnique();

            entity.Property(x => x.PartNumber).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.NetUnitPrice).HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.VatRatePercent).IsRequired();
        });

        // LaborType mapping.
        modelBuilder.Entity<LaborType>(entity =>
        {
            entity.ToTable("labortypes", table =>
            {
                table.HasCheckConstraint("CK_LaborTypes_HourlyNetRate", "\"HourlyNetRate\" >= 0 AND \"HourlyNetRate\" <= 100000000");
                table.HasCheckConstraint("CK_LaborTypes_VatRate", "\"VatRatePercent\" IN (0,5,18,27)");
            });

            entity.HasIndex(x => x.Code).IsUnique();

            entity.Property(x => x.Code).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.HourlyNetRate).HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.VatRatePercent).IsRequired();
        });
    }
}

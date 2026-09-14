using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Data;

public sealed partial class AutoServiceDbContext
{
    /**
     * Configures the quote entities (Quote, QuoteLine): table names, column
     * types and precisions, string-enum conversions, FK delete behaviours,
     * check constraints, indexes, and the xmin optimistic-concurrency
     * mapping. Kept separate from AutoServiceDbContext.PricingModel.cs,
     * whose doc comment scopes it to the Part/LaborType catalog only.
     *
     * @param modelBuilder Model builder passed in from OnModelCreating.
     */
    private void ConfigureQuotesModel(ModelBuilder modelBuilder)
    {
        // Quote mapping.
        modelBuilder.Entity<Quote>(entity =>
        {
            entity.ToTable("quotes", table =>
            {
                table.HasCheckConstraint("CK_Quotes_Totals", "\"TotalGross\" = \"TotalNet\" + \"TotalVat\"");
            });

            entity.HasIndex(x => x.QuoteNumber).IsUnique();
            entity.HasIndex(x => x.VehicleId);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.CreatedAt);

            entity.Property(x => x.QuoteNumber).HasMaxLength(20).IsRequired();
            entity.Property(x => x.Title).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Notes).HasMaxLength(1000);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
            entity.Property(x => x.CreatedAt).IsRequired();
            entity.Property(x => x.ValidUntil).IsRequired();
            entity.Property(x => x.SentAt);
            entity.Property(x => x.DecidedAt);
            entity.Property(x => x.TotalNet).HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.TotalVat).HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.TotalGross).HasPrecision(18, 2).IsRequired();

            // The xmin system column exists on every Postgres row already
            // and changes on every UPDATE; mapping it as a rowversion
            // concurrency token adds no new column and needs no migration
            // data, only this model-level mapping (D30).
            entity.Property(x => x.Version).IsRowVersion().HasColumnName("xmin").HasColumnType("xid");

            entity.HasOne(x => x.Vehicle)
                  .WithMany()
                  .HasForeignKey(x => x.VehicleId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Appointment)
                  .WithMany()
                  .HasForeignKey(x => x.AppointmentId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.CreatedByMechanic)
                  .WithMany()
                  .HasForeignKey(x => x.CreatedByMechanicId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasMany(x => x.Lines)
                  .WithOne(x => x.Quote)
                  .HasForeignKey(x => x.QuoteId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // QuoteLine mapping.
        modelBuilder.Entity<QuoteLine>(entity =>
        {
            entity.ToTable("quotelines", table =>
            {
                table.HasCheckConstraint("CK_QuoteLines_Quantity", "\"Quantity\" > 0 AND \"Quantity\" <= 10000");
                table.HasCheckConstraint("CK_QuoteLines_NetUnitPrice", "\"NetUnitPrice\" >= 0 AND \"NetUnitPrice\" <= 100000000");
                table.HasCheckConstraint("CK_QuoteLines_VatRate", "\"VatRatePercent\" IN (0,5,18,27)");
                table.HasCheckConstraint(
                    "CK_QuoteLines_LineKindIntegrity",
                    "(\"LineKind\" = 'Part' AND \"LaborTypeId\" IS NULL) OR (\"LineKind\" = 'Labor' AND \"PartId\" IS NULL)");
            });

            entity.HasIndex(x => x.QuoteId);

            entity.Property(x => x.LineKind).HasConversion<string>().HasMaxLength(16).IsRequired();
            entity.Property(x => x.Description).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Quantity).HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.NetUnitPrice).HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.VatRatePercent).IsRequired();
            entity.Property(x => x.NetAmount).HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.VatAmount).HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.GrossAmount).HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.SortOrder).IsRequired();

            entity.HasOne(x => x.Part)
                  .WithMany()
                  .HasForeignKey(x => x.PartId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.LaborType)
                  .WithMany()
                  .HasForeignKey(x => x.LaborTypeId)
                  .OnDelete(DeleteBehavior.SetNull);
        });
    }
}

using AutoService.ApiService.CompanyProfiles;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Data;

public sealed partial class AutoServiceDbContext
{
    /** Configures the single-row company profile table (id pinned to 1 by a check constraint). */
    private static void ConfigureCompanyProfileModel(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CompanyProfileEntity>(entity =>
        {
            entity.ToTable("companyprofiles", table =>
            {
                table.HasCheckConstraint("CK_CompanyProfiles_SingleRow", "\"Id\" = 1");
            });

            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.Name).HasMaxLength(CompanyProfileLimits.NameMaxLength).IsRequired();
            entity.Property(x => x.AddressLine).HasMaxLength(CompanyProfileLimits.AddressLineMaxLength).IsRequired();
            entity.Property(x => x.PostalCode).HasMaxLength(CompanyProfileLimits.PostalCodeLength).IsRequired();
            entity.Property(x => x.City).HasMaxLength(CompanyProfileLimits.CityMaxLength).IsRequired();
            entity.Property(x => x.TaxNumber).HasMaxLength(CompanyProfileLimits.TaxNumberLength).IsRequired();
            entity.Property(x => x.PhoneNumber).HasMaxLength(CompanyProfileLimits.PhoneNumberMaxLength).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(CompanyProfileLimits.EmailMaxLength).IsRequired();
        });
    }
}

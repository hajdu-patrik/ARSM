using AutoService.ApiService.CompanyProfiles;
using AutoService.ApiService.Domain;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace AutoService.UnitTests.Data;

/** The catalog, quote and company-profile mappings: money precision, VAT and range checks, xmin, delete rules. */
public sealed class CatalogQuoteModelTests : IDisposable
{
    private readonly AutoService.ApiService.Data.AutoServiceDbContext db = TestDbContextFactory.Create();

    public void Dispose() => db.Dispose();

    private IModel Model => db.Model;
    private IModel DesignTimeModel => db.GetService<IDesignTimeModel>().Model;

    [Fact]
    public void Parts_and_labor_types_keep_money_at_18_2_a_unique_code_and_the_xmin_version()
    {
        var parts = Model.Entity<Part>();
        var labor = Model.Entity<LaborType>();

        Assert.Equal("parts", parts.GetTableName());
        Assert.Equal("labortypes", labor.GetTableName());
        Assert.True(parts.Property("NetUnitPrice").IsMoney());
        Assert.True(labor.Property("HourlyNetRate").IsMoney());
        Assert.True(parts.HasUniqueIndex("PartNumber"));
        Assert.True(labor.HasUniqueIndex("Code"));
        Assert.True(parts.Property("Version").IsXminVersion());
        Assert.True(labor.Property("Version").IsXminVersion());
        Assert.Equal(new[] { 40, 120 }, new[] { parts.Property("PartNumber").GetMaxLength()!.Value, parts.Property("Name").GetMaxLength()!.Value });
        Assert.Equal(new[] { 40, 120 }, new[] { labor.Property("Code").GetMaxLength()!.Value, labor.Property("Name").GetMaxLength()!.Value });
    }

    [Fact]
    public void The_catalog_check_constraints_pin_the_price_range_and_the_vat_set()
    {
        var checks = DesignTimeModel.CheckConstraints();

        Assert.Equal("\"NetUnitPrice\" >= 0 AND \"NetUnitPrice\" <= 100000000", checks["CK_Parts_NetUnitPrice"]);
        Assert.Equal("\"VatRatePercent\" IN (0,5,18,27)", checks["CK_Parts_VatRate"]);
        Assert.Equal("\"HourlyNetRate\" >= 0 AND \"HourlyNetRate\" <= 100000000", checks["CK_LaborTypes_HourlyNetRate"]);
        Assert.Equal("\"VatRatePercent\" IN (0,5,18,27)", checks["CK_LaborTypes_VatRate"]);
    }

    [Fact]
    public void Quotes_keep_every_money_column_at_18_2_a_string_status_and_the_xmin_version()
    {
        var quotes = Model.Entity<Quote>();

        Assert.Equal("quotes", quotes.GetTableName());
        Assert.All(new[] { "TotalNet", "TotalVat", "TotalGross" }, name => Assert.True(quotes.Property(name).IsMoney(), name));
        Assert.True(quotes.Property("Status").IsStoredAsString(16));
        Assert.True(quotes.Property("Version").IsXminVersion());
        Assert.Equal(20, quotes.Property("QuoteNumber").GetMaxLength());
        Assert.Equal(120, quotes.Property("Title").GetMaxLength());
        Assert.Equal(1000, quotes.Property("Notes").GetMaxLength());
    }

    [Fact]
    public void Quotes_have_a_unique_number_the_four_lookup_indexes_and_the_net_plus_vat_check()
    {
        var quotes = Model.Entity<Quote>();

        Assert.True(quotes.HasUniqueIndex("QuoteNumber"));
        Assert.NotNull(quotes.Index("VehicleId"));
        Assert.NotNull(quotes.Index("Status"));
        Assert.NotNull(quotes.Index("CreatedAt"));
        Assert.Equal("\"TotalGross\" = \"TotalNet\" + \"TotalVat\"", DesignTimeModel.CheckConstraints()["CK_Quotes_Totals"]);
    }

    [Fact]
    public void Quote_delete_rules_cascade_from_vehicle_and_appointment_and_keep_the_quote_when_a_mechanic_leaves()
    {
        var quotes = Model.Entity<Quote>();

        Assert.Equal(DeleteBehavior.Cascade, quotes.ForeignKey("VehicleId").DeleteBehavior);
        Assert.Equal(DeleteBehavior.Cascade, quotes.ForeignKey("AppointmentId").DeleteBehavior);
        Assert.Equal(DeleteBehavior.SetNull, quotes.ForeignKey("CreatedByMechanicId").DeleteBehavior);
        Assert.Equal(DeleteBehavior.Cascade, Model.Entity<QuoteLine>().ForeignKey("QuoteId").DeleteBehavior);
    }

    [Fact]
    public void Quote_lines_keep_a_snapshot_when_the_catalog_row_is_deleted()
    {
        var lines = Model.Entity<QuoteLine>();

        Assert.Equal("quotelines", lines.GetTableName());
        Assert.Equal(DeleteBehavior.SetNull, lines.ForeignKey("PartId").DeleteBehavior);
        Assert.Equal(DeleteBehavior.SetNull, lines.ForeignKey("LaborTypeId").DeleteBehavior);
        Assert.NotNull(lines.Index("QuoteId"));
    }

    [Fact]
    public void Quote_line_money_is_18_2_the_kind_is_a_string_and_the_checks_pin_range_vat_and_kind_integrity()
    {
        var lines = Model.Entity<QuoteLine>();
        var checks = DesignTimeModel.CheckConstraints();

        Assert.All(
            new[] { "Quantity", "NetUnitPrice", "NetAmount", "VatAmount", "GrossAmount" },
            name => Assert.True(lines.Property(name).IsMoney(), name));
        Assert.True(lines.Property("LineKind").IsStoredAsString(16));
        Assert.Equal(120, lines.Property("Description").GetMaxLength());
        Assert.Equal("\"Quantity\" > 0 AND \"Quantity\" <= 10000", checks["CK_QuoteLines_Quantity"]);
        Assert.Equal("\"NetUnitPrice\" >= 0 AND \"NetUnitPrice\" <= 100000000", checks["CK_QuoteLines_NetUnitPrice"]);
        Assert.Equal("\"VatRatePercent\" IN (0,5,18,27)", checks["CK_QuoteLines_VatRate"]);
        Assert.Equal(
            "(\"LineKind\" = 'Part' AND \"LaborTypeId\" IS NULL) OR (\"LineKind\" = 'Labor' AND \"PartId\" IS NULL)",
            checks["CK_QuoteLines_LineKindIntegrity"]);
    }

    [Fact]
    public void The_company_profile_is_a_single_row_table_with_required_columns_at_the_shared_limits()
    {
        var profile = Model.Entity<CompanyProfileEntity>();

        Assert.Equal("companyprofiles", profile.GetTableName());
        Assert.Equal("\"Id\" = 1", DesignTimeModel.CheckConstraints()["CK_CompanyProfiles_SingleRow"]);
        Assert.Equal(ValueGenerated.Never, profile.Property("Id").ValueGenerated);
        Assert.Equal(CompanyProfileLimits.NameMaxLength, profile.Property("Name").GetMaxLength());
        Assert.Equal(CompanyProfileLimits.AddressLineMaxLength, profile.Property("AddressLine").GetMaxLength());
        Assert.Equal(CompanyProfileLimits.PostalCodeLength, profile.Property("PostalCode").GetMaxLength());
        Assert.Equal(CompanyProfileLimits.CityMaxLength, profile.Property("City").GetMaxLength());
        Assert.Equal(CompanyProfileLimits.TaxNumberLength, profile.Property("TaxNumber").GetMaxLength());
        Assert.Equal(CompanyProfileLimits.PhoneNumberMaxLength, profile.Property("PhoneNumber").GetMaxLength());
        Assert.Equal(CompanyProfileLimits.EmailMaxLength, profile.Property("Email").GetMaxLength());
        Assert.All(profile.GetProperties(), property => Assert.False(property.IsNullable, property.Name));
    }
}

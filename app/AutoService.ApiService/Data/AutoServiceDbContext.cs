using AutoService.ApiService.CompanyProfiles;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Pricing;
using AutoService.ApiService.Security;
using AutoService.ApiService.Domain.UniqueTypes;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AutoService.ApiService.Data;

/** The Identity-backed EF context; the per-area model configuration lives in the AutoServiceDbContext.*Model partials. */
public sealed partial class AutoServiceDbContext(DbContextOptions<AutoServiceDbContext> options) : IdentityDbContext<IdentityUser>(options)
{
    public DbSet<People> People => Set<People>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Mechanic> Mechanics => Set<Mechanic>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<RevokedJwtToken> RevokedJwtTokens => Set<RevokedJwtToken>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Part> Parts => Set<Part>();
    public DbSet<LaborType> LaborTypes => Set<LaborType>();
    public DbSet<Quote> Quotes => Set<Quote>();
    public DbSet<QuoteLine> QuoteLines => Set<QuoteLine>();
    public DbSet<CompanyProfileEntity> CompanyProfiles => Set<CompanyProfileEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigurePeopleModel(modelBuilder);
        ConfigureTokensModel(modelBuilder);
        ConfigureSchedulingModel(modelBuilder);

        ConfigurePricingModel(modelBuilder);
        ConfigureQuotesModel(modelBuilder);
        ConfigureCompanyProfileModel(modelBuilder);
    }

    /** Validates mechanic expertise constraints and quote totals before persisting changes. */
    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ValidateMechanicExpertise();
        ValidateQuoteTotals();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    /** Async twin of SaveChanges: runs the same expertise and quote-total validation first. */
    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        ValidateMechanicExpertise();
        ValidateQuoteTotals();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    /** Ensures each modified mechanic has 1..10 unique expertise values. */
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

    /** Throws if a modified quote's stored totals disagree with its loaded Lines,
     * or if totals changed without loading Lines (see CLAUDE.md Quote Anchors). */
    private void ValidateQuoteTotals()
    {
        var quoteEntries = ChangeTracker
            .Entries<Quote>()
            .Where(x => x.State is EntityState.Added or EntityState.Modified);

        foreach (var entry in quoteEntries)
        {
            var quote = entry.Entity;
            var linesLoaded = entry.Collection(q => q.Lines).IsLoaded;

            if (linesLoaded)
            {
                var expectedTotals = QuoteTotalsCalculator.Calculate(
                    quote.Lines.Select(line => new QuoteLineAmounts(line.NetAmount, line.VatAmount, line.GrossAmount)));

                if (quote.TotalNet != expectedTotals.TotalNet
                    || quote.TotalVat != expectedTotals.TotalVat
                    || quote.TotalGross != expectedTotals.TotalGross)
                {
                    throw new InvalidOperationException($"Quote {quote.Id} totals do not match the sum of its line amounts.");
                }

                continue;
            }

            var totalsTouched = entry.Property(q => q.TotalNet).IsModified
                || entry.Property(q => q.TotalVat).IsModified
                || entry.Property(q => q.TotalGross).IsModified;

            if (totalsTouched)
            {
                throw new InvalidOperationException($"Quote {quote.Id} totals were changed without loading Lines to recompute them.");
            }
        }
    }
}
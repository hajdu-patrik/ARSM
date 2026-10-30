using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;

namespace AutoService.UnitTests.Data;

/** SaveChanges guards expertise and quote totals before any command is sent; these cases all stop there. */
public sealed class DbContextSaveValidationTests
{
    private static Mechanic NewMechanic() =>
        new(new FullName("Bela", null, "Kovacs"), "mechanic@example.test", null, SpecializationType.All, [ExpertiseType.Engine]);

    private static void SetId<TEntity>(TEntity entity, int id)
        => typeof(TEntity).GetProperty("Id")!.SetValue(entity, id);

    private static QuoteLine Line() => new(QuoteLineKind.Part, "Oil filter", 1m, 100m, 27, 100m, 27m, 127m);

    /** A tracked quote with one line, its totals matching, and the Lines navigation marked loaded or not. */
    private static (AutoServiceDbContext Db, Quote Quote) TrackedQuote(bool linesLoaded)
    {
        var quote = new Quote("Service", null, new DateTime(2026, 12, 31), 1, null, null)
        {
            TotalNet = 100m,
            TotalVat = 27m,
            TotalGross = 127m,
        };
        SetId(quote, 1);
        quote.Lines.Add(Line());

        var db = TestDbContextFactory.Create();
        db.Attach(quote);
        db.Entry(quote).Collection(q => q.Lines).IsLoaded = linesLoaded;

        return (db, quote);
    }

    [Fact]
    public void A_new_mechanic_without_any_expertise_is_refused()
    {
        var mechanic = NewMechanic();
        mechanic.Expertise.Clear();
        using var db = TestDbContextFactory.Create();
        db.Mechanics.Add(mechanic);

        var exception = Assert.Throws<InvalidOperationException>(() => db.SaveChanges());

        Assert.Equal("A mechanic expertise list must contain at least 1 and at most 10 items.", exception.Message);
    }

    [Fact]
    public void More_than_ten_expertise_items_are_refused()
    {
        var mechanic = NewMechanic();
        mechanic.Expertise.AddRange(Enumerable.Repeat(ExpertiseType.Brakes, 10));
        using var db = TestDbContextFactory.Create();
        db.Mechanics.Add(mechanic);

        var exception = Assert.Throws<InvalidOperationException>(() => db.SaveChanges());

        Assert.Contains("at least 1 and at most 10", exception.Message);
    }

    [Fact]
    public void A_duplicate_expertise_item_is_refused()
    {
        var mechanic = NewMechanic();
        mechanic.Expertise.Add(ExpertiseType.Engine);
        using var db = TestDbContextFactory.Create();
        db.Mechanics.Add(mechanic);

        var exception = Assert.Throws<InvalidOperationException>(() => db.SaveChanges());

        Assert.Equal("A mechanic expertise list cannot contain duplicate items.", exception.Message);
    }

    [Fact]
    public async Task The_async_save_applies_the_same_guard()
    {
        var mechanic = NewMechanic();
        mechanic.Expertise.Clear();
        using var db = TestDbContextFactory.Create();
        db.Mechanics.Add(mechanic);

        await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
    }

    [Theory]
    [InlineData("net")]
    [InlineData("vat")]
    [InlineData("gross")]
    public void A_total_that_disagrees_with_the_loaded_lines_is_refused(string total)
    {
        var (db, quote) = TrackedQuote(linesLoaded: true);
        using (db)
        {
            if (total == "net") quote.TotalNet = 101m;
            if (total == "vat") quote.TotalVat = 28m;
            if (total == "gross") quote.TotalGross = 130m;

            var exception = Assert.Throws<InvalidOperationException>(() => db.SaveChanges());

            Assert.Equal("Quote 1 totals do not match the sum of its line amounts.", exception.Message);
        }
    }

    [Fact]
    public void Totals_changed_without_the_lines_loaded_are_refused()
    {
        var (db, quote) = TrackedQuote(linesLoaded: false);
        using (db)
        {
            quote.TotalNet = 200m;

            var exception = Assert.Throws<InvalidOperationException>(() => db.SaveChanges());

            Assert.Equal("Quote 1 totals were changed without loading Lines to recompute them.", exception.Message);
        }
    }
}

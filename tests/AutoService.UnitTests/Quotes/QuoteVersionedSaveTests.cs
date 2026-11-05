using AutoService.ApiService.Data;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Quotes;
using AutoService.UnitTests.Data;
using AutoService.UnitTests.Http;
using Microsoft.AspNetCore.Http;

namespace AutoService.UnitTests.Quotes;

/** A quote write whose own columns did not change still updates the row, so the xmin version check can fire (K4). */
public sealed class QuoteVersionedSaveTests
{
    private static Quote NewTrackedQuote(AutoServiceDbContext db)
    {
        var quote = PrivateStatic.WithId(new Quote("Olajcsere", null, QuoteFixtures.Now.AddDays(30), 3, null, null), 9);
        db.Attach(quote);
        return quote;
    }

    private static Task<IResult?> Save(AutoServiceDbContext db, Quote quote, uint version) =>
        PrivateStatic.Call<Task<IResult?>>(typeof(QuoteEndpoints), "SaveWithVersionAsync", db, quote, version, CancellationToken.None);

    /** An interceptor that records the modified Quote property names seen at save time. */
    private static ScriptedSaveInterceptor RecordModifiedQuoteProperties(List<string> modified) =>
        new(probe: context => modified.AddRange(context.ChangeTracker.Entries<Quote>()
            .SelectMany(entry => entry.Properties.Where(property => property.IsModified).Select(property => property.Metadata.Name))));

    [Fact]
    public async Task An_unchanged_quote_row_is_marked_modified_so_the_save_sends_an_update()
    {
        var modified = new List<string>();
        var interceptor = RecordModifiedQuoteProperties(modified);
        await using var db = TestDbContextFactory.Create(interceptor);
        var quote = NewTrackedQuote(db);

        var result = await Save(db, quote, version: 4);

        Assert.Null(result);
        Assert.Contains(nameof(Quote.Title), modified);
    }

    [Fact]
    public async Task A_deleted_quote_row_is_left_alone()
    {
        var modified = new List<string>();
        var interceptor = RecordModifiedQuoteProperties(modified);
        await using var db = TestDbContextFactory.Create(interceptor);
        var quote = NewTrackedQuote(db);
        db.Quotes.Remove(quote);

        await Save(db, quote, version: 4);

        Assert.DoesNotContain(nameof(Quote.Title), modified);
    }
}

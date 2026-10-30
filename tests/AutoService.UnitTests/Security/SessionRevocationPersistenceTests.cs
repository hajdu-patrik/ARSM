using AutoService.ApiService.Auth.Endpoints;
using AutoService.ApiService.Domain;
using AutoService.ApiService.Domain.UniqueTypes;
using AutoService.ApiService.Realtime;
using AutoService.ApiService.Security;

namespace AutoService.UnitTests.Security;

/** The persisted side of the session cutoffs: the value stamped on the row is the one memory takes after the
    commit, it climbs over repeated and persisted values, and a seeded cache behaves as before a restart. */
public sealed class SessionRevocationPersistenceTests
{
    private readonly RecordingSubscriptions subscriptions = new();
    private readonly SessionRevocationService service;

    public SessionRevocationPersistenceTests() => service = new SessionRevocationService([subscriptions]);

    private static Customer NewPerson() => new(new FullName("Test", null, "Person"), "person@example.test", null);

    private static long Seconds(DateTime utc) => new DateTimeOffset(utc).ToUnixTimeSeconds();

    /** Another instance of the same row (same id and stored cutoff), as each concurrent request loads its own. */
    private static Customer LoadedPerson(DateTime tokensValidAfter)
    {
        var person = NewPerson();
        person.TokensValidAfter = tokensValidAfter;
        return person;
    }

    private static DateTime WholeSecondsAhead(int seconds)
        => DateTimeOffset.FromUnixTimeSeconds(DateTimeOffset.UtcNow.ToUnixTimeSeconds() + seconds).UtcDateTime;

    [Fact]
    public void The_staged_cutoff_is_a_whole_second_ahead_of_now_and_equals_the_memory_one_after_apply()
    {
        var person = NewPerson();
        var beforeSeconds = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        var staged = service.StageCutoff(person);
        service.ApplyRevocation(person.Id, staged);

        Assert.Equal(staged, person.TokensValidAfter);
        Assert.Equal(DateTimeKind.Utc, staged.Kind);
        Assert.Equal(0, staged.Ticks % TimeSpan.TicksPerSecond);
        Assert.True(Seconds(staged) > beforeSeconds);
        Assert.Equal(staged, service.IssueTimeUtc(person.Id, DateTime.UtcNow));
        Assert.True(service.IsRevoked(person.Id, staged.AddSeconds(-1)));
        Assert.False(service.IsRevoked(person.Id, staged));
    }

    [Fact]
    public void Staging_alone_leaves_memory_and_streams_untouched()
    {
        var person = NewPerson();
        var nowUtc = DateTime.UtcNow;

        service.StageCutoff(person);

        Assert.False(service.IsRevoked(person.Id, nowUtc));
        Assert.Equal(nowUtc, service.IssueTimeUtc(person.Id, nowUtc));
        Assert.Empty(subscriptions.Disconnected);
    }

    [Fact]
    public void Apply_closes_the_streams_of_that_person_only()
    {
        var person = NewPerson();

        service.ApplyRevocation(person.Id, service.StageCutoff(person));

        Assert.Equal(new[] { person.Id }, subscriptions.Disconnected);
    }

    [Fact]
    public void Repeated_revocations_climb_the_stamped_cutoff()
    {
        var person = NewPerson();

        var first = service.StageCutoff(person);
        service.ApplyRevocation(person.Id, first);
        var second = service.StageCutoff(person);
        service.ApplyRevocation(person.Id, second);

        Assert.True(second > first);
        Assert.True(service.IsRevoked(person.Id, first));
        Assert.False(service.IsRevoked(person.Id, second));
    }

    [Fact]
    public void A_persisted_value_ahead_of_now_is_climbed_over()
    {
        var person = NewPerson();
        var persisted = DateTime.UtcNow.AddSeconds(20);
        persisted = persisted.AddTicks(-(persisted.Ticks % TimeSpan.TicksPerSecond));
        person.TokensValidAfter = persisted;

        var staged = service.StageCutoff(person);

        Assert.Equal(persisted.AddSeconds(1), staged);
        Assert.Equal(staged, person.TokensValidAfter);
    }

    [Fact]
    public void A_memory_value_ahead_of_the_row_is_climbed_over()
    {
        var person = NewPerson();
        service.Seed(person.Id, DateTime.UtcNow.AddSeconds(30));
        var seeded = service.IssueTimeUtc(person.Id, DateTime.UtcNow);

        var staged = service.StageCutoff(person);

        Assert.Equal(seeded.AddSeconds(1), staged);
    }

    [Fact]
    public void Two_revocations_staged_in_the_same_second_before_either_is_applied_get_climbing_cutoffs()
    {
        // A persisted value ahead of now pins the floor, so both stagings fall into the same second.
        var persisted = WholeSecondsAhead(60);
        var first = LoadedPerson(persisted);
        var second = LoadedPerson(persisted);

        var firstCutoff = service.StageCutoff(first);
        var secondCutoff = service.StageCutoff(second);
        service.ApplyRevocation(first.Id, firstCutoff);
        service.ApplyRevocation(second.Id, secondCutoff);

        Assert.Equal(persisted.AddSeconds(1), firstCutoff);
        Assert.Equal(persisted.AddSeconds(2), secondCutoff);
        Assert.True(service.IsRevoked(first.Id, firstCutoff));
        Assert.False(service.IsRevoked(first.Id, secondCutoff));
    }

    [Fact]
    public void Concurrent_stagings_of_one_person_never_share_a_cutoff()
    {
        var persisted = WholeSecondsAhead(60);
        var people = Enumerable.Range(0, 64).Select(_ => LoadedPerson(persisted)).ToArray();

        var cutoffs = new DateTime[people.Length];
        Parallel.For(0, people.Length, i => cutoffs[i] = service.StageCutoff(people[i]));

        var expected = Enumerable.Range(1, people.Length).Select(offset => persisted.AddSeconds(offset));
        Assert.Equal(expected, cutoffs.Order());
    }

    [Fact]
    public void A_staging_whose_save_failed_leaves_memory_unchanged_and_the_next_one_climbs_over_it()
    {
        var persisted = WholeSecondsAhead(60);
        var person = LoadedPerson(persisted);

        var unused = service.StageCutoff(person);
        var next = service.StageCutoff(LoadedPerson(persisted));

        Assert.False(service.IsRevoked(person.Id, DateTimeOffset.UtcNow));
        Assert.True(next > unused);
    }

    [Fact]
    public void A_seeded_cache_behaves_like_the_service_before_the_restart()
    {
        var person = NewPerson();
        var beforeRestart = new SessionRevocationService([]);
        var oldToken = beforeRestart.IssueTimeUtc(person.Id, DateTime.UtcNow);
        var cutoff = beforeRestart.StageCutoff(person);
        beforeRestart.ApplyRevocation(person.Id, cutoff);

        var restarted = new SessionRevocationService([]);
        restarted.Seed(person.Id, person.TokensValidAfter!.Value);

        Assert.True(restarted.IsRevoked(person.Id, oldToken));
        Assert.False(restarted.IsRevoked(person.Id, cutoff));
        Assert.Equal(cutoff, restarted.IssueTimeUtc(person.Id, cutoff.AddSeconds(-1)));
    }

    [Fact]
    public void Seeding_never_lowers_a_cutoff_and_closes_no_stream()
    {
        var person = NewPerson();
        var high = DateTime.UtcNow.AddSeconds(30);
        service.Seed(person.Id, high);

        service.Seed(person.Id, DateTime.UtcNow.AddSeconds(10));

        Assert.True(service.IsRevoked(person.Id, DateTimeOffset.UtcNow.AddSeconds(20)));
        Assert.Empty(subscriptions.Disconnected);
    }

    [Fact]
    public void The_row_cutoff_dates_a_new_token_when_memory_knows_nothing()
    {
        var rowCutoff = DateTime.UtcNow.AddSeconds(5);
        rowCutoff = rowCutoff.AddTicks(-(rowCutoff.Ticks % TimeSpan.TicksPerSecond));

        Assert.Equal(rowCutoff, service.IssueTimeUtc(7, DateTime.UtcNow, rowCutoff));
    }

    [Fact]
    public void Delete_path_revocation_works_in_memory_without_a_row()
    {
        var nowUtc = DateTime.UtcNow;
        var token = service.IssueTimeUtc(5, nowUtc);

        service.RevokeAll(5);

        Assert.True(service.IsRevoked(5, token));
        Assert.Equal(new[] { 5 }, subscriptions.Disconnected);
    }

    [Fact]
    public void Cutoffs_older_than_a_token_lifetime_plus_skew_are_not_loaded()
    {
        var nowUtc = new DateTime(2026, 10, 29, 12, 0, 0, DateTimeKind.Utc);

        var oldest = SessionRevocationWarmupService.OldestUsefulCutoff(nowUtc);

        Assert.Equal(AuthEndpoints.AccessTokenTtl + AuthEndpoints.ClockSkew, nowUtc - oldest);
    }

    private sealed class RecordingSubscriptions : IUserSubscriptions
    {
        public List<int> Disconnected { get; } = [];

        public void DisconnectUser(int userId) => Disconnected.Add(userId);
    }
}

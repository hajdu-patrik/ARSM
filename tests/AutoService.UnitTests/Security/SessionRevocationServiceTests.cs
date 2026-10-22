using AutoService.ApiService.Realtime;
using AutoService.ApiService.Security;

namespace AutoService.UnitTests.Security;

/** The ordering rule of the session cutoffs: with whole-second iat claims, what was issued before a revocation
    is gone and what is issued after it survives, even when both happen in the same second. */
public sealed class SessionRevocationServiceTests
{
    private readonly SessionRevocationService service = new(Array.Empty<IUserSubscriptions>());

    [Fact]
    public void A_token_issued_before_the_revocation_is_revoked_and_the_next_one_is_not()
    {
        var nowUtc = DateTime.UtcNow;
        var earlier = service.IssueTimeUtc(1, nowUtc);

        service.RevokeAll(1);
        var later = service.IssueTimeUtc(1, nowUtc);

        Assert.True(service.IsRevoked(1, earlier));
        Assert.False(service.IsRevoked(1, later));
        Assert.True(later > earlier);
    }

    [Fact]
    public void Two_revocations_in_a_row_keep_their_order()
    {
        var nowUtc = DateTime.UtcNow;

        service.RevokeAll(1);
        var afterFirst = service.IssueTimeUtc(1, nowUtc);
        service.RevokeAll(1);
        var afterSecond = service.IssueTimeUtc(1, nowUtc);

        Assert.True(service.IsRevoked(1, afterFirst));
        Assert.False(service.IsRevoked(1, afterSecond));
    }

    [Fact]
    public void Another_person_is_untouched()
    {
        var nowUtc = DateTime.UtcNow;

        service.RevokeAll(1);

        Assert.False(service.IsRevoked(2, nowUtc));
        Assert.Equal(nowUtc, service.IssueTimeUtc(2, nowUtc));
    }
}

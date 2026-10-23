using AutoService.ApiService.Email.Sending;

namespace AutoService.UnitTests.Email;

/** Subject and recipient are cleaned before they reach an RFC 5322 header. */
public sealed class EmailHeaderSanitizerTests
{
    private const string Emoji = "\U0001F600";
    private const string Ellipsis = "\u2026";

    private static int CodePointCount(string value) => value.EnumerateRunes().Count();

    [Theory]
    [InlineData("Hello\r\nBcc: evil@example.com", "Hello Bcc: evil@example.com")]
    [InlineData("a\nb", "a b")]
    [InlineData("a\rb", "a b")]
    [InlineData("a\u0000b\u0007c", "a b c")]
    [InlineData("a\u007Fb\u0085c", "a b c")]
    [InlineData("a\u2028b\u2029c", "a b c")]
    public void SanitizeSubject_turns_control_characters_into_one_space(string input, string expected)
    {
        Assert.Equal(expected, EmailHeaderSanitizer.SanitizeSubject(input));
    }

    [Fact]
    public void SanitizeSubject_collapses_whitespace_runs_and_trims()
    {
        var result = EmailHeaderSanitizer.SanitizeSubject("  Quote \t\t 42 \r\n\r\n ready  ");

        Assert.Equal("Quote 42 ready", result);
    }

    [Fact]
    public void SanitizeSubject_keeps_a_normal_subject_unchanged()
    {
        const string subject = "Árajánlat Q-1 - ARSM | Quote Q-1";

        Assert.Equal(subject, EmailHeaderSanitizer.SanitizeSubject(subject));
    }

    [Fact]
    public void SanitizeSubject_is_empty_when_only_control_characters_and_spaces_remain()
    {
        Assert.Equal(string.Empty, EmailHeaderSanitizer.SanitizeSubject(" \r\n\t\u0000 "));
    }

    [Fact]
    public void SanitizeSubject_keeps_a_subject_of_exactly_the_limit()
    {
        var subject = new string('a', EmailHeaderSanitizer.MaxSubjectCodePoints);

        Assert.Equal(subject, EmailHeaderSanitizer.SanitizeSubject(subject));
    }

    [Fact]
    public void SanitizeSubject_cuts_a_long_subject_to_the_limit_with_an_ellipsis()
    {
        var result = EmailHeaderSanitizer.SanitizeSubject(new string('a', 400));

        Assert.Equal(EmailHeaderSanitizer.MaxSubjectCodePoints, CodePointCount(result));
        Assert.EndsWith(Ellipsis, result);
        Assert.Equal(new string('a', 249) + Ellipsis, result);
    }

    [Fact]
    public void SanitizeSubject_keeps_an_emoji_at_the_cut_whole()
    {
        var result = EmailHeaderSanitizer.SanitizeSubject(new string('a', 248) + Emoji + new string('b', 10));

        Assert.Equal(new string('a', 248) + Emoji + Ellipsis, result);
        Assert.Equal(EmailHeaderSanitizer.MaxSubjectCodePoints, CodePointCount(result));
    }

    [Fact]
    public void SanitizeSubject_drops_an_emoji_that_would_not_fit_instead_of_splitting_it()
    {
        var result = EmailHeaderSanitizer.SanitizeSubject(new string('a', 249) + Emoji + "b");

        Assert.Equal(new string('a', 249) + Ellipsis, result);
        Assert.DoesNotContain(result, char.IsSurrogate);
    }

    [Theory]
    [InlineData("info@arsm.hu")]
    [InlineData("first.last+tag@example.co.uk")]
    [InlineData("a@b")]
    public void IsSingleAddress_accepts_a_bare_address(string address)
    {
        Assert.True(EmailHeaderSanitizer.IsSingleAddress(address));
    }

    [Theory]
    [InlineData("ARSM <info@arsm.hu>")]
    [InlineData("<info@arsm.hu>")]
    [InlineData("a@example.com, b@example.com")]
    [InlineData("a@example.com;b@example.com")]
    [InlineData("a@example.com b@example.com")]
    [InlineData(" a@example.com")]
    [InlineData("a@example.com\r\nBcc: b@example.com")]
    [InlineData("a@@example.com")]
    [InlineData("a@b@example.com")]
    [InlineData("\"quoted\"@example.com")]
    [InlineData("noatsign.example.com")]
    [InlineData("@example.com")]
    [InlineData("a@")]
    [InlineData("")]
    public void IsSingleAddress_rejects_names_lists_whitespace_and_a_second_at_sign(string address)
    {
        Assert.False(EmailHeaderSanitizer.IsSingleAddress(address));
    }
}

using AutoService.ApiService.CompanyProfiles;
using AutoService.ApiService.Configuration;

namespace AutoService.UnitTests.CompanyProfiles;

/** The .env write-back changes only the ARSM_COMPANY_* lines and keeps every other byte. */
public sealed class EnvFileRewriterTests
{
    private const string Header = "# --- Company letterhead on quote PDFs ---";

    private static readonly CompanyProfile Profile =
        new("New Kft.", "Fo utca 2.", "2222", "Gyor", "11111111-1-11", "+36 1 111 1111", "new@example.com");

    private static readonly IReadOnlyDictionary<string, string> Values = CompanyProfileEnvValues.From(Profile);

    private static string Block(string eol, params string[] keys)
        => Header + eol + string.Concat(keys.Select(key => key + eol));

    [Fact]
    public void Rewrite_replaces_an_existing_key_in_place()
    {
        var content = "A=1\nARSM_COMPANY_NAME=Old\nB=2\n";

        var result = EnvFileRewriter.Rewrite(content, new Dictionary<string, string> { ["ARSM_COMPANY_NAME"] = "New" });

        Assert.Equal("A=1\nARSM_COMPANY_NAME=New\nB=2\n", result);
    }

    [Fact]
    public void Rewrite_appends_a_missing_key_after_the_last_block_line()
    {
        var content = "A=1\n" + Block("\n", "ARSM_COMPANY_NAME=Old", "ARSM_COMPANY_CITY=Old") + "\nB=2\n";

        var result = EnvFileRewriter.Rewrite(content, new Dictionary<string, string>
        {
            ["ARSM_COMPANY_NAME"] = "New",
            ["ARSM_COMPANY_EMAIL"] = "new@example.com",
        });

        Assert.Equal(
            "A=1\n" + Block("\n", "ARSM_COMPANY_NAME=New", "ARSM_COMPANY_CITY=Old", "ARSM_COMPANY_EMAIL=new@example.com") + "\nB=2\n",
            result);
    }

    [Fact]
    public void Rewrite_appends_a_missing_key_after_a_block_comment_line()
    {
        var content = Block("\n", "# note", "ARSM_COMPANY_NAME=Old") + "\nB=2\n";

        var result = EnvFileRewriter.Rewrite(content, new Dictionary<string, string> { ["ARSM_COMPANY_CITY"] = "Gyor" });

        Assert.Equal(Block("\n", "# note", "ARSM_COMPANY_NAME=Old", "ARSM_COMPANY_CITY=Gyor") + "\nB=2\n", result);
    }

    [Fact]
    public void Rewrite_appends_at_file_end_when_the_block_is_absent()
    {
        var result = EnvFileRewriter.Rewrite("A=1\n", new Dictionary<string, string> { ["ARSM_COMPANY_CITY"] = "Gyor" });

        Assert.Equal("A=1\nARSM_COMPANY_CITY=Gyor\n", result);
    }

    [Fact]
    public void Rewrite_keeps_a_missing_trailing_newline_missing()
    {
        var result = EnvFileRewriter.Rewrite("A=1", new Dictionary<string, string> { ["ARSM_COMPANY_CITY"] = "Gyor" });

        Assert.Equal("A=1\nARSM_COMPANY_CITY=Gyor", result);
    }

    [Fact]
    public void Rewrite_leaves_comments_blank_lines_and_other_keys_untouched()
    {
        var content = "# top comment\n\nA=1 # keep\nARSM_COMPANY_NAMEX=keep\n  ARSM_COMPANY_NAME=indented\n" + Block("\n", "ARSM_COMPANY_NAME=Old");

        var result = EnvFileRewriter.Rewrite(content, new Dictionary<string, string> { ["ARSM_COMPANY_NAME"] = "New" });

        Assert.Equal(content.Replace("NAME=Old", "NAME=New"), result);
    }

    [Fact]
    public void Rewrite_preserves_crlf_line_endings()
    {
        var content = "A=1\r\n" + Block("\r\n", "ARSM_COMPANY_NAME=Old") + "B=2\r\n";

        var result = EnvFileRewriter.Rewrite(content, new Dictionary<string, string>
        {
            ["ARSM_COMPANY_NAME"] = "New",
            ["ARSM_COMPANY_CITY"] = "Gyor",
        });

        Assert.Equal("A=1\r\n" + Block("\r\n", "ARSM_COMPANY_NAME=New", "ARSM_COMPANY_CITY=Gyor") + "B=2\r\n", result);
        Assert.DoesNotContain("\n", result.Replace("\r\n", string.Empty));
    }

    [Fact]
    public void Rewrite_preserves_lf_line_endings()
    {
        var result = EnvFileRewriter.Rewrite("A=1\nARSM_COMPANY_NAME=Old\n", Values);

        Assert.DoesNotContain("\r", result);
        Assert.Contains("ARSM_COMPANY_EMAIL=new@example.com\n", result);
    }

    [Fact]
    public void Rewrite_writes_all_seven_profile_keys()
    {
        var result = EnvFileRewriter.Rewrite(string.Empty, Values);

        Assert.Equal(7, result.Split('\n', StringSplitOptions.RemoveEmptyEntries).Length);
        Assert.Contains("ARSM_COMPANY_TAX_NUMBER=11111111-1-11\n", result);
    }

    [Fact]
    public void Rewrite_keeps_the_byte_order_mark()
    {
        var result = EnvFileRewriter.Rewrite("\uFEFFA=1\nARSM_COMPANY_NAME=Old\n", new Dictionary<string, string> { ["ARSM_COMPANY_NAME"] = "New" });

        Assert.Equal("\uFEFFA=1\nARSM_COMPANY_NAME=New\n", result);
    }
}

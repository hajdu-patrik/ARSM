namespace AutoService.ApiService.CompanyProfiles;

/** Pure line-wise .env rewriter: replaces given keys, appends missing ones, leaves every other byte alone. */
internal static class EnvFileRewriter
{
    private const string BlockHeader = "# --- Company letterhead on quote PDFs ---";
    private const string BlockKeyPrefix = "ARSM_COMPANY_";

    public static string Rewrite(string content, IReadOnlyDictionary<string, string> values)
    {
        var eol = content.Contains("\r\n", StringComparison.Ordinal) ? "\r\n" : "\n";
        var lines = Split(content);
        var found = new HashSet<string>(StringComparer.Ordinal);

        for (var i = 0; i < lines.Count; i++)
        {
            var key = KeyOf(lines[i].Text);
            if (key is not null && values.TryGetValue(key, out var value))
            {
                lines[i] = lines[i] with { Text = $"{key}={Sanitize(value)}" };
                found.Add(key);
            }
        }

        var missing = values.Where(pair => !found.Contains(pair.Key))
            .Select(pair => new Line($"{pair.Key}={Sanitize(pair.Value)}", eol))
            .ToList();
        if (missing.Count > 0)
        {
            Insert(lines, InsertionIndex(lines), missing);
        }

        return string.Concat(lines.Select(line => line.Text + line.Terminator));
    }

    private static List<Line> Split(string content)
    {
        var lines = new List<Line>();
        var start = 0;
        while (start < content.Length)
        {
            var newline = content.IndexOf('\n', start);
            if (newline < 0)
            {
                lines.Add(new Line(content[start..], string.Empty));
                break;
            }

            var hasCarriageReturn = newline > start && content[newline - 1] == '\r';
            var textEnd = hasCarriageReturn ? newline - 1 : newline;
            lines.Add(new Line(content[start..textEnd], hasCarriageReturn ? "\r\n" : "\n"));
            start = newline + 1;
        }

        return lines;
    }

    private static string? KeyOf(string text)
    {
        var separator = text.IndexOf('=');
        return separator > 0 ? text[..separator] : null;
    }

    private static string Sanitize(string value)
        => value.Replace('\r', ' ').Replace('\n', ' ');

    /** After the last consecutive ARSM_COMPANY_* or comment line below the block header, else the end of the file. */
    private static int InsertionIndex(List<Line> lines)
    {
        var header = lines.FindIndex(line => line.Text.Trim() == BlockHeader);
        if (header < 0)
        {
            return lines.Count;
        }

        var index = header + 1;
        while (index < lines.Count && IsBlockLine(lines[index].Text))
        {
            index++;
        }

        return index;
    }

    private static bool IsBlockLine(string text)
        => text.StartsWith(BlockKeyPrefix, StringComparison.Ordinal) || text.StartsWith('#');

    /** Inserts at the index; a missing trailing newline stays missing on the new last line. */
    private static void Insert(List<Line> lines, int index, List<Line> added)
    {
        var atEnd = index == lines.Count;
        if (atEnd && lines.Count > 0 && lines[^1].Terminator.Length == 0)
        {
            lines[^1] = lines[^1] with { Terminator = added[0].Terminator };
            added[^1] = added[^1] with { Terminator = string.Empty };
        }

        lines.InsertRange(index, added);
    }

    private readonly record struct Line(string Text, string Terminator);
}

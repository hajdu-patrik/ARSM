/** Reads single values from the repository-root .env file without ever throwing or logging them. */
internal static class RootEnvFile
{
    /** Returns the last value of the key, or null when the file or key is missing or unreadable. */
    public static string? ReadValue(string path, string key)
    {
        string[] lines;
        try
        {
            if (!File.Exists(path))
            {
                return null;
            }

            lines = File.ReadAllLines(path);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return null;
        }

        string? result = null;
        foreach (var rawLine in lines)
        {
            var line = rawLine.Trim();
            if (line.Length == 0 || line.StartsWith('#'))
            {
                continue;
            }

            var separator = line.IndexOf('=');
            if (separator <= 0 || line[..separator].Trim() != key)
            {
                continue;
            }

            result = Unquote(line[(separator + 1)..].Trim());
        }

        return result;
    }

    private static string Unquote(string value)
    {
        if (value.Length >= 2 && (value[0] == '"' || value[0] == '\'') && value[^1] == value[0])
        {
            return value[1..^1];
        }

        return value;
    }
}

using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using AutoService.ApiService.Configuration;

namespace AutoService.ApiService.CompanyProfiles;

/** Pure appsettings.Local.json rewriter: swaps the seven CompanyProfile string values in place, nothing else. */
internal static class LocalSettingsRewriter
{
    private const string SectionName = "CompanyProfile";
    private const string ByteOrderMark = "\uFEFF";

    private static readonly JsonSerializerOptions StringOptions = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };
    private static readonly JsonReaderOptions ReaderOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    public static string Rewrite(string json, CompanyProfile profile)
    {
        var prefix = json.StartsWith(ByteOrderMark, StringComparison.Ordinal) ? ByteOrderMark : string.Empty;
        var bytes = Encoding.UTF8.GetBytes(json[prefix.Length..]);
        var replacements = FindReplacements(bytes, Values(profile));
        if (replacements.Count == 0)
        {
            return json;
        }

        using var output = new MemoryStream(bytes.Length + 64);
        var position = 0;
        foreach (var (start, end, text) in replacements)
        {
            output.Write(bytes, position, start - position);
            output.Write(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(text, StringOptions)));
            position = end;
        }

        output.Write(bytes, position, bytes.Length - position);
        return prefix + Encoding.UTF8.GetString(output.GetBuffer(), 0, (int)output.Length);
    }

    private static Dictionary<string, string> Values(CompanyProfile profile) => new(StringComparer.Ordinal)
    {
        ["Name"] = profile.Name,
        ["AddressLine"] = profile.AddressLine,
        ["PostalCode"] = profile.PostalCode,
        ["City"] = profile.City,
        ["TaxNumber"] = profile.TaxNumber,
        ["PhoneNumber"] = profile.PhoneNumber,
        ["Email"] = profile.Email,
    };

    /** Byte spans of the string values to replace, in file order. */
    private static List<(int Start, int End, string Text)> FindReplacements(byte[] bytes, Dictionary<string, string> values)
    {
        var found = new List<(int Start, int End, string Text)>();
        var reader = new Utf8JsonReader(bytes, ReaderOptions);
        var inSection = false;
        string? property = null;

        while (reader.Read())
        {
            if (reader.TokenType == JsonTokenType.PropertyName)
            {
                property = reader.GetString();
                if (reader.CurrentDepth == 1 && property == SectionName)
                {
                    reader.Read();
                    if (reader.TokenType != JsonTokenType.StartObject)
                    {
                        return found;
                    }

                    inSection = true;
                }

                continue;
            }

            if (inSection && reader.CurrentDepth == 1 && reader.TokenType == JsonTokenType.EndObject)
            {
                return found;
            }

            if (inSection && reader.CurrentDepth == 2 && reader.TokenType == JsonTokenType.String
                && property is not null && values.TryGetValue(property, out var value))
            {
                found.Add(((int)reader.TokenStartIndex, (int)reader.BytesConsumed, value));
            }
        }

        return found;
    }
}

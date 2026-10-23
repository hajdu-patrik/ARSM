using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace AutoService.ApiService.Email.Sending;

/** Sends one mail through the Resend REST API; no retry loop, the result only says whether a retry could help. */
public sealed class ResendEmailSender(
    HttpClient httpClient,
    EmailSettings settings,
    ILogger<ResendEmailSender> logger) : IEmailSender
{
    // The only hardcoded host in the API.
    private const string Endpoint = "https://api.resend.com/emails";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public async Task<EmailSendResult> SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        var recipient = message.To.Trim();
        if (!EmailHeaderSanitizer.IsSingleAddress(recipient))
        {
            return LocalRefusal("recipient is not a single plain e-mail address");
        }

        var subject = EmailHeaderSanitizer.SanitizeSubject(message.Subject);
        if (subject.Length == 0)
        {
            return LocalRefusal("empty subject");
        }

        var domain = recipient[(recipient.LastIndexOf('@') + 1)..];

        try
        {
            using var request = BuildRequest(message, recipient, subject);
            using var response = await httpClient.SendAsync(request, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            return Classify(response.StatusCode, body, domain);
        }
        catch (Exception exception) when (exception is HttpRequestException
            || (exception is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            logger.LogWarning("Resend request to a {RecipientDomain} recipient failed: {ErrorType}", domain, exception.GetType().Name);
            return EmailSendResult.Failure(null, $"network error: {exception.Message}", retryable: true);
        }
    }

    private HttpRequestMessage BuildRequest(EmailMessage message, string recipient, string subject)
    {
        var payload = new ResendRequest(
            settings.From,
            [recipient],
            settings.ReplyTo,
            subject,
            message.Html,
            message.Text,
            message.Attachments
                .Select(a => new ResendAttachment(a.FileName, Convert.ToBase64String(a.Content), a.ContentType, a.ContentId))
                .ToList());

        var request = new HttpRequestMessage(HttpMethod.Post, Endpoint)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.ResendApiKey);
        return request;
    }

    private EmailSendResult Classify(HttpStatusCode statusCode, string body, string domain)
    {
        var status = (int)statusCode;

        if (status is >= 200 and < 300)
        {
            var id = TryRead<ResendSuccess>(body)?.Id;
            if (!string.IsNullOrEmpty(id))
            {
                logger.LogInformation("Resend accepted a mail for a {RecipientDomain} recipient (status {Status})", domain, status);
                return EmailSendResult.Success(id, status);
            }

            logger.LogWarning("Resend answered {Status} without an id for a {RecipientDomain} recipient", status, domain);
            return EmailSendResult.Failure(status, "Resend: 2xx response without an id", retryable: true);
        }

        var error = TryRead<ResendError>(body);
        var name = string.IsNullOrWhiteSpace(error?.Name) ? null : error.Name;
        var detail = string.IsNullOrWhiteSpace(error?.Message) ? $"HTTP {status}" : error.Message;
        var message = $"Resend {status}{(name is null ? string.Empty : $" {name}")}: {detail}";
        var retryable = status == 429 || status >= 500;

        logger.LogWarning(
            "Resend refused a mail for a {RecipientDomain} recipient: status {Status}, error {ErrorName}, message {ErrorMessage}",
            domain, status, name, detail);

        return EmailSendResult.Failure(status, message, retryable);
    }

    /** A permanent, local refusal: no request is made, because a retry would fail the same way. */
    private static EmailSendResult LocalRefusal(string reason) =>
        EmailSendResult.Failure(null, $"not sent: {reason}", retryable: false);

    private static T? TryRead<T>(string body) where T : class
    {
        try
        {
            return JsonSerializer.Deserialize<T>(body, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private sealed record ResendRequest(
        [property: JsonPropertyName("from")] string From,
        [property: JsonPropertyName("to")] IReadOnlyList<string> To,
        [property: JsonPropertyName("reply_to")] string ReplyTo,
        [property: JsonPropertyName("subject")] string Subject,
        [property: JsonPropertyName("html")] string Html,
        [property: JsonPropertyName("text")] string Text,
        [property: JsonPropertyName("attachments")] IReadOnlyList<ResendAttachment> Attachments);

    private sealed record ResendAttachment(
        [property: JsonPropertyName("filename")] string FileName,
        [property: JsonPropertyName("content")] string Content,
        [property: JsonPropertyName("content_type")] string ContentType,
        [property: JsonPropertyName("content_id"), JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ContentId);

    private sealed record ResendSuccess([property: JsonPropertyName("id")] string? Id);

    private sealed record ResendError(
        [property: JsonPropertyName("name")] string? Name,
        [property: JsonPropertyName("message")] string? Message);
}

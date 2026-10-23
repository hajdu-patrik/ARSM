using System.Net;
using System.Text;
using System.Text.Json;
using AutoService.ApiService.Email;
using AutoService.ApiService.Email.Sending;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoService.UnitTests.Email;

/** The Resend sender builds the documented request and classifies every answer without a real network call. */
public sealed class ResendEmailSenderTests
{
    private const string Key = "re_unit_test_key";
    private const string OkBody = "{\"id\":\"abc\"}";

    private static readonly EmailSettings Settings =
        new(Key, "ARSM <info@arsm.hu>", "info@arsm.hu", "https://arsm.hu");

    private static readonly byte[] PdfBytes = [0x25, 0x50, 0x44, 0x46, 0x2D];

    private static readonly EmailMessage Message = new(
        "customer@example.com",
        "Árajánlat Q-1 | Quote Q-1",
        "<p>Hello</p>",
        "Hello",
        [
            new EmailAttachment("arsm-logo.png", [1, 2, 3], "image/png", "arsm-logo"),
            new EmailAttachment("quote.pdf", PdfBytes, "application/pdf", null),
        ]);

    [Fact]
    public async Task SendAsync_posts_the_documented_request()
    {
        var handler = new FakeHandler(HttpStatusCode.OK, OkBody);

        await CreateSender(handler).SendAsync(Message, CancellationToken.None);

        Assert.Equal(1, handler.CallCount);
        Assert.Equal(HttpMethod.Post, handler.Method);
        Assert.Equal("https://api.resend.com/emails", handler.RequestUri?.ToString());
        Assert.Equal("Bearer", handler.AuthorizationScheme);
        Assert.Equal(Key, handler.AuthorizationParameter);
        Assert.StartsWith("application/json", handler.ContentType);
    }

    [Fact]
    public async Task SendAsync_body_uses_the_snake_case_keys_and_base64_attachments()
    {
        var handler = new FakeHandler(HttpStatusCode.OK, OkBody);

        await CreateSender(handler).SendAsync(Message, CancellationToken.None);

        using var body = JsonDocument.Parse(handler.Body);
        var root = body.RootElement;
        Assert.Equal("ARSM <info@arsm.hu>", root.GetProperty("from").GetString());
        Assert.Equal(["customer@example.com"], root.GetProperty("to").EnumerateArray().Select(e => e.GetString()));
        Assert.Equal("info@arsm.hu", root.GetProperty("reply_to").GetString());
        Assert.Equal("Árajánlat Q-1 | Quote Q-1", root.GetProperty("subject").GetString());
        Assert.Equal("<p>Hello</p>", root.GetProperty("html").GetString());
        Assert.Equal("Hello", root.GetProperty("text").GetString());

        var attachments = root.GetProperty("attachments").EnumerateArray().ToList();
        Assert.Equal(2, attachments.Count);
        Assert.Equal("arsm-logo.png", attachments[0].GetProperty("filename").GetString());
        Assert.Equal(Convert.ToBase64String([1, 2, 3]), attachments[0].GetProperty("content").GetString());
        Assert.Equal("image/png", attachments[0].GetProperty("content_type").GetString());
        Assert.Equal("arsm-logo", attachments[0].GetProperty("content_id").GetString());
        Assert.Equal(Convert.ToBase64String(PdfBytes), attachments[1].GetProperty("content").GetString());
        Assert.Equal("application/pdf", attachments[1].GetProperty("content_type").GetString());
        Assert.False(attachments[1].TryGetProperty("content_id", out _));
    }

    [Fact]
    public async Task SendAsync_sanitises_the_subject_in_the_request()
    {
        var handler = new FakeHandler(HttpStatusCode.OK, OkBody);
        var message = Message with { Subject = "Hi\r\nBcc: evil@example.com" };

        await CreateSender(handler).SendAsync(message, CancellationToken.None);

        using var body = JsonDocument.Parse(handler.Body);
        Assert.Equal("Hi Bcc: evil@example.com", body.RootElement.GetProperty("subject").GetString());
    }

    [Fact]
    public async Task SendAsync_with_an_id_is_sent_with_the_provider_message_id()
    {
        var result = await CreateSender(new FakeHandler(HttpStatusCode.OK, OkBody))
            .SendAsync(Message, CancellationToken.None);

        Assert.True(result.Sent);
        Assert.Equal("abc", result.ProviderMessageId);
        Assert.Equal(200, result.StatusCode);
        Assert.False(result.Retryable);
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("{\"id\":\"\"}")]
    [InlineData("not json")]
    public async Task SendAsync_2xx_without_an_id_is_a_retryable_failure(string body)
    {
        var result = await CreateSender(new FakeHandler(HttpStatusCode.OK, body))
            .SendAsync(Message, CancellationToken.None);

        Assert.False(result.Sent);
        Assert.Null(result.ProviderMessageId);
        Assert.True(result.Retryable);
        Assert.Equal(200, result.StatusCode);
    }

    [Theory]
    [InlineData(429)]
    [InlineData(500)]
    [InlineData(503)]
    public async Task SendAsync_rate_limit_and_server_errors_are_retryable(int status)
    {
        var body = "{\"name\":\"x\",\"message\":\"y\"}";

        var result = await CreateSender(new FakeHandler((HttpStatusCode)status, body))
            .SendAsync(Message, CancellationToken.None);

        Assert.False(result.Sent);
        Assert.True(result.Retryable);
        Assert.Equal(status, result.StatusCode);
    }

    [Fact]
    public async Task SendAsync_422_is_not_retryable_and_names_the_status_and_error()
    {
        var body = "{\"name\":\"validation_error\",\"message\":\"x\"}";

        var result = await CreateSender(new FakeHandler(HttpStatusCode.UnprocessableEntity, body))
            .SendAsync(Message, CancellationToken.None);

        Assert.False(result.Sent);
        Assert.False(result.Retryable);
        Assert.Equal(422, result.StatusCode);
        Assert.Contains("422", result.Message);
        Assert.Contains("validation_error", result.Message);
        Assert.DoesNotContain(Key, result.Message);
    }

    [Fact]
    public async Task SendAsync_non_json_error_body_is_still_a_failure_with_the_status()
    {
        var result = await CreateSender(new FakeHandler(HttpStatusCode.Forbidden, "<html>nope</html>"))
            .SendAsync(Message, CancellationToken.None);

        Assert.False(result.Sent);
        Assert.False(result.Retryable);
        Assert.Contains("403", result.Message);
    }

    [Fact]
    public async Task SendAsync_network_error_is_a_retryable_failure_without_status()
    {
        var handler = new FakeHandler(new HttpRequestException("boom"));

        var result = await CreateSender(handler).SendAsync(Message, CancellationToken.None);

        Assert.False(result.Sent);
        Assert.True(result.Retryable);
        Assert.Null(result.StatusCode);
        Assert.Contains("network error", result.Message);
    }

    [Fact]
    public async Task SendAsync_timeout_is_a_retryable_failure()
    {
        var handler = new FakeHandler(new TaskCanceledException("timeout"));

        var result = await CreateSender(handler).SendAsync(Message, CancellationToken.None);

        Assert.False(result.Sent);
        Assert.True(result.Retryable);
    }

    [Theory]
    [InlineData("")]
    [InlineData("ARSM <a@example.com>")]
    [InlineData("a@example.com, b@example.com")]
    [InlineData("a@example.com\r\nBcc: b@example.com")]
    [InlineData("a@@example.com")]
    public async Task SendAsync_invalid_recipient_fails_locally_without_a_request(string recipient)
    {
        var handler = new FakeHandler(HttpStatusCode.OK, OkBody);

        var result = await CreateSender(handler).SendAsync(Message with { To = recipient }, CancellationToken.None);

        Assert.False(result.Sent);
        Assert.False(result.Retryable);
        Assert.Null(result.StatusCode);
        Assert.StartsWith("not sent", result.Message);
        Assert.Equal(0, handler.CallCount);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("\r\n\t")]
    public async Task SendAsync_blank_subject_fails_locally_without_a_request(string subject)
    {
        var handler = new FakeHandler(HttpStatusCode.OK, OkBody);

        var result = await CreateSender(handler).SendAsync(Message with { Subject = subject }, CancellationToken.None);

        Assert.False(result.Sent);
        Assert.False(result.Retryable);
        Assert.StartsWith("not sent", result.Message);
        Assert.Equal(0, handler.CallCount);
    }

    private static ResendEmailSender CreateSender(FakeHandler handler) =>
        new(new HttpClient(handler), Settings, NullLogger<ResendEmailSender>.Instance);
}

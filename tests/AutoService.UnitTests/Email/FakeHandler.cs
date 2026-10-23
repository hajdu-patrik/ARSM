using System.Net;
using System.Text;

namespace AutoService.UnitTests.Email;

/** Records the one request and answers the scripted response or throws the scripted exception. */
internal sealed class FakeHandler : HttpMessageHandler
{
    private readonly HttpStatusCode _status;
    private readonly string _responseBody;
    private readonly Exception? _failure;

    public FakeHandler(HttpStatusCode status, string responseBody)
    {
        _status = status;
        _responseBody = responseBody;
    }

    public FakeHandler(Exception failure)
    {
        _failure = failure;
        _responseBody = string.Empty;
    }

    public int CallCount { get; private set; }

    public HttpMethod? Method { get; private set; }

    public Uri? RequestUri { get; private set; }

    public string? AuthorizationScheme { get; private set; }

    public string? AuthorizationParameter { get; private set; }

    public string? ContentType { get; private set; }

    public string Body { get; private set; } = string.Empty;

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        CallCount++;
        Method = request.Method;
        RequestUri = request.RequestUri;
        AuthorizationScheme = request.Headers.Authorization?.Scheme;
        AuthorizationParameter = request.Headers.Authorization?.Parameter;
        ContentType = request.Content?.Headers.ContentType?.ToString();
        Body = request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken);

        if (_failure is not null)
        {
            throw _failure;
        }

        return new HttpResponseMessage(_status)
        {
            Content = new StringContent(_responseBody, Encoding.UTF8, "application/json"),
        };
    }
}

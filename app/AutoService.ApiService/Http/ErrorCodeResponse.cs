namespace AutoService.ApiService.Http;

/** Machine-readable error body (`{"code":"..."}`) for conflicts and gates the WebUI branches on. */
internal sealed record ErrorCodeResponse(string Code);

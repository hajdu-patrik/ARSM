using Microsoft.Extensions.Configuration;

/**
 * Aspire AppHost entrypoint for local PostgreSQL, ApiService, and WebUI orchestration.
 */
var builder = DistributedApplication.CreateBuilder(args);

var postgresPort = GetRequiredPort(builder.Configuration, "Ports:Postgres");
var webUiPort = GetRequiredPort(builder.Configuration, "Ports:WebUi");

var postgresPassword = builder.AddParameter("postgres-password", secret: true);
var jwtSecret = builder.AddParameter("jwt-secret", secret: true);

var postgresServer = builder.AddPostgres("postgres", password: postgresPassword)
                            .WithHostPort(postgresPort)
                            .WithEndpoint("tcp", endpoint => endpoint.IsProxied = false)
                            .WithDataVolume("autoservice-postgres-data")
                            .WithLifetime(Aspire.Hosting.ApplicationModel.ContainerLifetime.Persistent)
                            .WithEnvironment("PGGSSENCMODE", "disable");

var postgresDb = postgresServer.AddDatabase("AutoServiceDb");

var apiService = builder.AddProject("apiservice", "../AutoService.ApiService/AutoService.ApiService.csproj")
                        .WithReference(postgresDb)
                        .WaitFor(postgresDb)
                        .WithEnvironment("JwtSettings__Secret", jwtSecret)
                        .WithEnvironment("PGGSSENCMODE", "disable");

builder.AddJavaScriptApp("webui", "../AutoService.WebUI", "dev")
    .WithReference(apiService)
    .WithEnvironment("VITE_API_URL", apiService.GetEndpoint("https"))
    .WithHttpsEndpoint(targetPort: webUiPort, port: webUiPort, env: "PORT", isProxied: false)
    .WithExternalHttpEndpoints();

builder.Build().Run();

/**
 * Reads a required integer port from AppHost configuration and fails fast on invalid values.
 */
static int GetRequiredPort(IConfiguration configuration, string configurationKey)
{
    var rawPort = configuration[configurationKey];
    if (!int.TryParse(rawPort, out var configuredPort))
    {
        throw new InvalidOperationException($"Missing or invalid AppHost config key: '{configurationKey}'.");
    }

    return configuredPort;
}
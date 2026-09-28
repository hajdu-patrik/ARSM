using Microsoft.Extensions.Configuration;

/**
 * Aspire AppHost entrypoint for local PostgreSQL, S3-compatible object storage (RustFS), ApiService,
 * and WebUI orchestration.
 */
var builder = DistributedApplication.CreateBuilder(args);

var postgresPort = GetRequiredPort(builder.Configuration, "Ports:Postgres");
var minioApiPort = GetRequiredPort(builder.Configuration, "Ports:MinioApi");
var minioConsolePort = GetRequiredPort(builder.Configuration, "Ports:MinioConsole");
var webUiPort = GetRequiredPort(builder.Configuration, "Ports:WebUi");
var configuredWebUiSiteUrl = GetRequiredConfigValue(builder.Configuration, "WebUi:SiteUrl");

var postgresPassword = builder.AddParameter("postgres-password", secret: true);
var jwtSecret = builder.AddParameter("jwt-secret", secret: true);
var minioUser = builder.AddParameter("minio-user", secret: true);
var minioPassword = builder.AddParameter("minio-password", secret: true);

// Pinned image tag: an implicit tag lets an Aspire package bump change the PostgreSQL major
// version, which the postgres 18+ image refuses to start against an existing older data volume.
var postgresServer = builder.AddPostgres("postgres", password: postgresPassword)
                            .WithImageTag("18.3")
                            .WithHostPort(postgresPort)
                            .WithEndpoint("tcp", endpoint => endpoint.IsProxied = false)
                            .WithDataVolume("autoservice-postgres-data")
                            .WithLifetime(Aspire.Hosting.ApplicationModel.ContainerLifetime.Persistent)
                            .WithEnvironment("PGGSSENCMODE", "disable");

var postgresDb = postgresServer.AddDatabase("AutoServiceDb");

// Local S3-compatible object storage for profile pictures. RustFS replaced MinIO when the MinIO
// images were withdrawn from Docker Hub and quay.io (2026-09); it speaks the same S3 API and
// serves /data by default. The resource, parameter and port names keep "minio" so existing
// user secrets and appsettings stay valid. The data volume and the persistent lifetime keep
// uploaded objects across AppHost restarts, and the image tag is pinned for the same reason
// PostgreSQL is: an implicit tag can change the server version underneath an existing volume.
var minio = builder.AddContainer("minio", "rustfs/rustfs")
                   .WithImageTag("1.0.0")
                   .WithEnvironment("RUSTFS_ACCESS_KEY", minioUser)
                   .WithEnvironment("RUSTFS_SECRET_KEY", minioPassword)
                   .WithEnvironment("RUSTFS_CONSOLE_ENABLE", "true")
                   .WithHttpEndpoint(port: minioApiPort, targetPort: 9000, name: "api", isProxied: false)
                   .WithHttpEndpoint(port: minioConsolePort, targetPort: 9001, name: "console", isProxied: false)
                   .WithVolume("autoservice-rustfs-data", "/data")
                   .WithLifetime(Aspire.Hosting.ApplicationModel.ContainerLifetime.Persistent)
                   .WithHttpHealthCheck(path: "/health", endpointName: "api");

var apiService = builder.AddProject("apiservice", "../AutoService.ApiService/AutoService.ApiService.csproj")
                        .WithReference(postgresDb)
                        .WaitFor(postgresDb)
                        .WaitFor(minio)
                        .WithEnvironment("JwtSettings__Secret", jwtSecret)
                        .WithEnvironment("ObjectStorage__ServiceUrl", minio.GetEndpoint("api"))
                        .WithEnvironment("ObjectStorage__AccessKeyId", minioUser)
                        .WithEnvironment("ObjectStorage__SecretAccessKey", minioPassword)
                        .WithEnvironment("ObjectStorage__AutoCreateBucket", "true")
                        .WithEnvironment("PGGSSENCMODE", "disable")
                        .WithHttpHealthCheck("/health");

var webUi = builder.AddJavaScriptApp("webui", "../AutoService.WebUI", "dev")
                   .WithReference(apiService)
                   .WaitFor(apiService)
                   .WithEnvironment("VITE_API_URL", apiService.GetEndpoint("https"))
                   .WithEnvironment("VITE_SITE_URL", configuredWebUiSiteUrl)
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

/**
 * Reads a required non-blank string from AppHost configuration and fails fast when it is missing or blank.
 */
static string GetRequiredConfigValue(IConfiguration configuration, string configurationKey)
{
    var value = configuration[configurationKey];
    if (string.IsNullOrWhiteSpace(value))
    {
        throw new InvalidOperationException($"Missing or invalid AppHost config key: '{configurationKey}'.");
    }

    return value;
}
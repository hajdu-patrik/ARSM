/**
 * Aspire AppHost entrypoint.
 *
 * Orchestrates local development infrastructure and projects:
 * - PostgreSQL container + persistent volume
 * - ApiService project wiring and startup ordering
 * - WebUI npm app wiring with API endpoint injection
 *
 * Configuration contract:
 * - Ports:Postgres must be a valid integer
 * - Ports:WebUi must be a valid integer
 * - secret parameters are supplied via user secrets/environment
 */
var builder = DistributedApplication.CreateBuilder(args);

/**
 * Reads and validates configured PostgreSQL port.
 *
 * @param postgresPortRaw Raw config value from Ports:Postgres.
 * @param postgresPort Parsed integer target.
 * @return Parsed postgresPort is used by AddPostgres resource.
 */
var postgresPortRaw = builder.Configuration["Ports:Postgres"];
if (!int.TryParse(postgresPortRaw, out var postgresPort))
{
    throw new InvalidOperationException("Missing or invalid AppHost config key: 'Ports:Postgres'.");
}

/**
 * Reads and validates configured WebUI port.
 *
 * @param webUiPortRaw Raw config value from Ports:WebUi.
 * @param webUiPort Parsed integer target.
 * @return Parsed webUiPort is used by WebUI HTTPS endpoint.
 */
var webUiPortRaw = builder.Configuration["Ports:WebUi"];
if (!int.TryParse(webUiPortRaw, out var webUiPort))
{
    throw new InvalidOperationException("Missing or invalid AppHost config key: 'Ports:WebUi'.");
}

var postgresPassword = builder.AddParameter("postgres-password", secret: true);
var jwtSecret = builder.AddParameter("jwt-secret", secret: true);

/**
 * PostgreSQL resource setup.
 *
 * @return Persistent postgres server resource with fixed configured port,
 * data volume, and GSS encryption disabled for local environment compatibility.
 */
var postgresServer = builder.AddPostgres("postgres", password: postgresPassword)
                            // Use direct host-port binding to keep Docker and Aspire health checks aligned.
                            .WithHostPort(postgresPort)
                            .WithEndpoint("tcp", endpoint => endpoint.IsProxied = false)
                            .WithDataVolume("autoservice-postgres-data")
                            .WithLifetime(Aspire.Hosting.ApplicationModel.ContainerLifetime.Persistent)
                            .WithEnvironment("PGGSSENCMODE", "disable");

var postgresDb = postgresServer.AddDatabase("AutoServiceDb");

/**
 * ApiService project resource wiring.
 *
 * @return API project waits for database readiness and receives required JWT/PG env variables.
 */
var apiService = builder.AddProject<Projects.AutoService_ApiService>("apiservice")
                        .WithReference(postgresDb)
                        .WaitFor(postgresDb)
                        .WithEnvironment("JwtSettings__Secret", jwtSecret)
                        .WithEnvironment("PGGSSENCMODE", "disable");

/**
 * WebUI resource wiring.
 *
 * @return React dev server resource with API URL injected from API HTTPS endpoint,
 * fixed HTTPS port binding, and external endpoint exposure for local use.
 */
var webUi = builder.AddNpmApp("webui", "../AutoService.WebUI", "dev")
                   .WithReference(apiService)
                   .WithEnvironment("VITE_API_URL", apiService.GetEndpoint("https"))
                   .WithHttpsEndpoint(port: webUiPort, env: "PORT")
                   .WithExternalHttpEndpoints();

/**
 * Builds and runs the distributed application host.
 *
 * @return Control transfers to Aspire runtime until host shutdown.
 */
builder.Build().Run();
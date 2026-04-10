var builder = DistributedApplication.CreateBuilder(args);

var postgresPortRaw = builder.Configuration["Ports:Postgres"];
if (!int.TryParse(postgresPortRaw, out var postgresPort))
{
    throw new InvalidOperationException("Missing or invalid AppHost config key: 'Ports:Postgres'.");
}

var webUiPortRaw = builder.Configuration["Ports:WebUi"];
if (!int.TryParse(webUiPortRaw, out var webUiPort))
{
    throw new InvalidOperationException("Missing or invalid AppHost config key: 'Ports:WebUi'.");
}

var postgresPassword = builder.AddParameter("postgres-password", secret: true);
var jwtSecret = builder.AddParameter("jwt-secret", secret: true);

// Database definition (PostgreSQL)
var postgresServer = builder.AddPostgres("postgres", password: postgresPassword, port: postgresPort)
                            .WithDataVolume("autoservice-postgres-data")
                            .WithLifetime(Aspire.Hosting.ApplicationModel.ContainerLifetime.Persistent)
                            .WithEnvironment("PGGSSENCMODE", "disable");

var postgresDb = postgresServer.AddDatabase("AutoServiceDb");

// Backend (ASP.NET Core) definition and reference to PostgreSQL
var apiService = builder.AddProject<Projects.AutoService_ApiService>("apiservice")
                        .WithReference(postgresDb)
                        .WaitFor(postgresDb)
                        .WithEnvironment("JwtSettings__Secret", jwtSecret)
                        .WithEnvironment("PGGSSENCMODE", "disable");

// Frontend (React) setting up and reference to API
var webUi = builder.AddNpmApp("webui", "../AutoService.WebUI", "dev")
                   .WithReference(apiService)
                   .WithEnvironment("VITE_API_URL", apiService.GetEndpoint("https"))
                   .WithHttpsEndpoint(port: webUiPort, env: "PORT")
                   .WithExternalHttpEndpoints();

builder.Build().Run();
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

// Database definition (PostgreSQL)
var postgresServer = builder.AddPostgres("postgres", password: postgresPassword, port: postgresPort)
                            .WithDataVolume("autoservice-postgres-data")
                            .WithLifetime(Aspire.Hosting.ApplicationModel.ContainerLifetime.Persistent);

var postgresDb = postgresServer.AddDatabase("AutoServiceDb");

// Backend (ASP.NET Core) definition and reference to PostgreSQL
var apiService = builder.AddProject<Projects.AutoService_ApiService>("apiservice")
                        .WithReference(postgresDb)
                        .WaitFor(postgresDb);

// Frontend (React) setting up and reference to API
var webUi = builder.AddNpmApp("webui", "../AutoService.WebUI", "dev")
                   .WithReference(apiService)
                   .WithEnvironment("VITE_API_URL", apiService.GetEndpoint("https"))
                   .WithHttpEndpoint(port: webUiPort, env: "PORT")
                   .WithExternalHttpEndpoints();

builder.Build().Run();
var builder = DistributedApplication.CreateBuilder(args);

// Database definition (PostgreSQL)
var postgres = builder.AddPostgres("postgres")
                      .AddDatabase("AutoServiceDb");

// Backend (ASP.NET Core) definition and reference to PostgreSQL
var apiService = builder.AddProject<Projects.AutoService_ApiService>("apiservice")
                        .WithReference(postgres);

// Frontend (React) setting up and reference to API
var webUi = builder.AddNpmApp("webui", "../AutoService.WebUI", "dev")
                   .WithReference(apiService)
                   .WithEnvironment("VITE_API_URL", apiService.GetEndpoint("https"))
                   .WithHttpEndpoint(env: "PORT")
                   .WithExternalHttpEndpoints();

builder.Build().Run();
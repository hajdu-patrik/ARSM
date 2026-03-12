using AutoService.ApiService.Data;
using AutoService.ApiService.DataInitialization;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Optional local overrides for running EF CLI/API outside AppHost.
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Service registration section (DI container).
builder.Services.AddOpenApi();
builder.Services.AddDbContext<AutoServiceDbContext>(options =>
{
    var connectionString = ConnectionStringResolver.Resolve(builder.Configuration);

    options.UseNpgsql(connectionString);
});

var app = builder.Build();

// Startup data initialization (runs migrations + data seed when DB is empty).
await app.EnsureSeededAsync();

// -------------------------
// Middleware pipeline starts
// -------------------------

// OpenAPI endpoint (development only).
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Middleware: redirects HTTP requests to HTTPS.
app.UseHttpsRedirection();

// Endpoint mapping section (currently no custom API endpoints mapped here).
app.Run();


static class ConnectionStringResolver
{
    /**
     * Resolves database connection string from environment first, then configuration.
     *
     * @param configuration ASP.NET Core configuration root.
     * @return A non-empty PostgreSQL connection string.
     */
    public static string Resolve(IConfiguration configuration)
    {
        var fromEnvironment = Environment.GetEnvironmentVariable("ConnectionStrings__AutoServiceDb");
        var fromConfiguration = configuration.GetConnectionString("AutoServiceDb");

        var connectionString = string.IsNullOrWhiteSpace(fromEnvironment)
            ? fromConfiguration
            : fromEnvironment;

        if (string.IsNullOrWhiteSpace(connectionString) || connectionString.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Connection string 'AutoServiceDb' is missing. Run through AppHost (Aspire injects it). If you want to run the API project separately, provide a valid connection string in appsettings.Local.json or set the environment variable 'ConnectionStrings__AutoServiceDb'.");
        }

        return connectionString;
    }
}

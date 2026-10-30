using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using OpenTelemetry.Instrumentation.AspNetCore;

namespace AutoService.UnitTests.ServiceDefaults;

/** The Aspire defaults every service shares: the live self-check, the dev-only /health, the trace filter and OTLP. */
public sealed class ServiceDefaultsExtensionsTests
{
    private static WebApplicationBuilder NewBuilder(string environment, string otlpEndpoint = "")
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = environment });
        builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"] = otlpEndpoint;
        return builder;
    }

    private static string[] MappedPaths(WebApplication app) => ((IEndpointRouteBuilder)app).DataSources
        .SelectMany(source => source.Endpoints)
        .OfType<RouteEndpoint>()
        .Select(endpoint => endpoint.RoutePattern.RawText ?? string.Empty)
        .Order()
        .ToArray();

    [Fact]
    public async Task The_default_health_check_is_a_healthy_self_check_tagged_live()
    {
        var builder = NewBuilder(Environments.Production);
        builder.AddDefaultHealthChecks();
        await using var app = builder.Build();

        var registration = Assert.Single(app.Services.GetRequiredService<IOptions<HealthCheckServiceOptions>>().Value.Registrations);
        var report = await app.Services.GetRequiredService<HealthCheckService>().CheckHealthAsync(candidate => candidate.Tags.Contains("live"));

        Assert.Equal("self", registration.Name);
        Assert.Contains("live", registration.Tags);
        Assert.Equal(HealthStatus.Healthy, report.Status);
        Assert.Contains("self", report.Entries.Keys);
    }

    [Fact]
    public void AddServiceDefaults_registers_the_health_checks_and_both_telemetry_providers()
    {
        var builder = NewBuilder(Environments.Production);

        builder.AddServiceDefaults();
        using var app = builder.Build();

        Assert.NotNull(app.Services.GetService<HealthCheckService>());
        Assert.NotNull(app.Services.GetService<OpenTelemetry.Trace.TracerProvider>());
        Assert.NotNull(app.Services.GetService<OpenTelemetry.Metrics.MeterProvider>());
    }

    [Fact]
    public void Production_maps_only_the_liveness_endpoint()
    {
        var builder = NewBuilder(Environments.Production);
        builder.AddServiceDefaults();
        using var app = builder.Build();

        app.MapDefaultEndpoints();

        Assert.Equal(new[] { "/alive" }, MappedPaths(app));
    }

    [Fact]
    public void Development_also_maps_the_full_health_endpoint()
    {
        var builder = NewBuilder(Environments.Development);
        builder.AddServiceDefaults();
        using var app = builder.Build();

        app.MapDefaultEndpoints();

        Assert.Equal(new[] { "/alive", "/health" }, MappedPaths(app));
    }

    [Theory]
    [InlineData("/health", false)]
    [InlineData("/health/ready", false)]
    [InlineData("/alive", false)]
    [InlineData("/api/customers", true)]
    [InlineData("/healthy-things", true)]
    public void Health_probes_are_kept_out_of_the_traces(string path, bool expectedTraced)
    {
        var builder = NewBuilder(Environments.Production);
        builder.AddServiceDefaults();
        using var app = builder.Build();
        var options = app.Services.GetRequiredService<IOptionsMonitor<AspNetCoreTraceInstrumentationOptions>>().Get(Options.DefaultName);
        var context = new DefaultHttpContext();
        context.Request.Path = path;

        Assert.Equal(expectedTraced, options.Filter!(context));
    }

    [Fact]
    public void An_otlp_endpoint_adds_the_exporter_registrations_and_a_blank_one_does_not()
    {
        var without = NewBuilder(Environments.Production, otlpEndpoint: "");
        var blank = NewBuilder(Environments.Production, otlpEndpoint: "   ");
        var with = NewBuilder(Environments.Production, otlpEndpoint: "http://localhost:4317");

        without.ConfigureOpenTelemetry();
        blank.ConfigureOpenTelemetry();
        with.ConfigureOpenTelemetry();

        Assert.Equal(without.Services.Count, blank.Services.Count);
        Assert.True(with.Services.Count > without.Services.Count);
    }
}

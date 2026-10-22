namespace AutoService.ApiService.Security;

/** Validates deployment topology when process-local auth rate-limit state is used. */
public static class InProcessLimiterTopologyGuard
{
    private const string TopologyKey = "Deployment:RateLimiterTopology";
    private const string SingleInstanceValue = "SingleInstance";

    /** Fails non-Development startup unless deployment explicitly confirms a single API instance. */
    public static void Validate(IConfiguration configuration, IHostEnvironment environment)
    {
        if (environment.IsDevelopment())
        {
            return;
        }

        var configuredTopology = configuration[TopologyKey];
        if (SingleInstanceValue.Equals(configuredTopology, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        throw new InvalidOperationException(
            "Auth rate limits, login bans, the warmed token denylist and the session cutoffs are process-local. Set Deployment:RateLimiterTopology=SingleInstance only after confirming this ApiService deployment runs exactly one instance, or replace them with distributed implementations before scaling out.");
    }
}
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace AutoService.ApiService.Data;

/** The CanConnect probe of AddDbContextCheck, minus its catch-all: cancellation propagates, so an aborted
    /health request yields no verdict, while a refused, timed-out or hung database still reports Unhealthy. */
internal sealed class DatabaseHealthCheck(AutoServiceDbContext dbContext) : IHealthCheck
{
    /** Above a cold Npgsql connect on a local host, below the 10 s HTTP probe timeout of the Aspire AppHost. */
    public static readonly TimeSpan RegistrationTimeout = TimeSpan.FromSeconds(5);

    /** Healthy when the database accepts a connection, otherwise the registration's failure status. */
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            return await dbContext.Database.CanConnectAsync(cancellationToken)
                ? HealthCheckResult.Healthy()
                : new HealthCheckResult(context.Registration.FailureStatus);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            return new HealthCheckResult(context.Registration.FailureStatus, exception.Message, exception);
        }
    }
}

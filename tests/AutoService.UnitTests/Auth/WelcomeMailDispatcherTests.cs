using AutoService.ApiService.Auth.Endpoints;
using AutoService.UnitTests.Security;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AutoService.UnitTests.Auth;

/** The welcome mail runs detached: a failure is logged as a warning by type only and never reaches the caller. */
public sealed class WelcomeMailDispatcherTests
{
    [Fact]
    public async Task A_failing_scope_is_swallowed_and_logged_as_a_warning_with_the_exception_type()
    {
        var logger = new RecordingLogger();

        WelcomeMailDispatcher.Dispatch(new ThrowingScopeFactory(new TimeoutException("boom")), logger, "new.mechanic@example.test", "Bela");

        var entry = await logger.WaitForFirstAsync();
        Assert.Equal(LogLevel.Warning, entry.Level);
        Assert.Equal("Welcome e-mail dispatch failed with TimeoutException.", entry.Message);
    }

    [Fact]
    public async Task The_log_never_carries_the_recipient_or_the_exception_text()
    {
        var logger = new RecordingLogger();

        WelcomeMailDispatcher.Dispatch(new ThrowingScopeFactory(new InvalidOperationException("secret detail")), logger, "new.mechanic@example.test", "Bela");

        var entry = await logger.WaitForFirstAsync();
        Assert.DoesNotContain("new.mechanic@example.test", entry.Message);
        Assert.DoesNotContain("secret detail", entry.Message);
        Assert.Null(entry.Exception);
    }

    [Fact]
    public async Task A_provider_without_the_database_context_is_also_swallowed()
    {
        var logger = new RecordingLogger();
        var scopeFactory = new ServiceCollection().BuildServiceProvider().GetRequiredService<IServiceScopeFactory>();

        WelcomeMailDispatcher.Dispatch(scopeFactory, logger, "new.mechanic@example.test", "Bela");

        var entry = await logger.WaitForFirstAsync();
        Assert.Equal(LogLevel.Warning, entry.Level);
        Assert.Equal("Welcome e-mail dispatch failed with InvalidOperationException.", entry.Message);
    }

    [Fact]
    public void Dispatch_returns_without_throwing_even_when_the_scope_cannot_be_created()
    {
        var exception = Record.Exception(() => WelcomeMailDispatcher.Dispatch(
            new ThrowingScopeFactory(new InvalidOperationException("boom")), new RecordingLogger(), "a@example.test", "Bela"));

        Assert.Null(exception);
    }
}

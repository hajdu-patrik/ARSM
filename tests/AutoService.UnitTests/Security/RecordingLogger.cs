using Microsoft.Extensions.Logging;

namespace AutoService.UnitTests.Security;

/** One captured log call: level, formatted message and the attached exception. */
internal sealed record LogEntry(LogLevel Level, string Message, Exception? Exception);

/** Captures formatted log entries so a test can assert level and message; no logging package needed. */
internal class RecordingLogger : ILogger
{
    private readonly object gate = new();
    private readonly List<LogEntry> entries = [];
    private readonly TaskCompletionSource<LogEntry> first = new(TaskCreationOptions.RunContinuationsAsynchronously);

    public IReadOnlyList<LogEntry> Entries
    {
        get
        {
            lock (gate)
            {
                return entries.ToArray();
            }
        }
    }

    /** Completes with the first entry, for code that logs from a detached task. */
    public Task<LogEntry> WaitForFirstAsync() => first.Task.WaitAsync(TimeSpan.FromSeconds(10));

    public IDisposable? BeginScope<TState>(TState state)
        where TState : notnull => null;

    public bool IsEnabled(LogLevel logLevel) => true;

    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        var entry = new LogEntry(logLevel, formatter(state, exception), exception);

        lock (gate)
        {
            entries.Add(entry);
        }

        first.TrySetResult(entry);
    }
}

/** The typed flavour, for classes that take an ILogger of their own type. */
internal sealed class RecordingLogger<T> : RecordingLogger, ILogger<T>;

/** Hands out one recording logger per category, so a test can read what a middleware logged. */
internal sealed class RecordingLoggerFactory : ILoggerFactory
{
    private readonly Dictionary<string, RecordingLogger> loggers = [];

    public RecordingLogger For(string category)
    {
        lock (loggers)
        {
            return loggers.TryGetValue(category, out var logger) ? logger : loggers[category] = new RecordingLogger();
        }
    }

    public IReadOnlyList<LogEntry> AllEntries
    {
        get
        {
            lock (loggers)
            {
                return loggers.Values.SelectMany(logger => logger.Entries).ToArray();
            }
        }
    }

    public ILogger CreateLogger(string categoryName) => For(categoryName);

    public void AddProvider(ILoggerProvider provider)
    {
    }

    public void Dispose()
    {
    }
}

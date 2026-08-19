using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace WarehouseApp.Api.Logging;

/// <summary>Writes one structured JSON record per line and rotates local files by day/size.</summary>
public sealed class RollingFileLoggerProvider(string directory, long maxFileBytes, int retainedFileCount)
    : ILoggerProvider
{
    private static readonly Regex SensitiveField = new(
        "(?i)(password|access[_-]?token|refresh[_-]?token|token|secret|connectionstring|authorization|customer[_-]?(phone|address)|phone|address)\\s*([:=])\\s*(\\\"[^\\\"]*\\\"|[^;\\s,]+)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex BearerToken = new(
        "(?i)(\\bbearer\\s+)[A-Za-z0-9._~+/=-]+",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private readonly object sync = new();
    private readonly ConcurrentDictionary<string, RollingFileLogger> loggers = new();

    public ILogger CreateLogger(string categoryName) =>
        loggers.GetOrAdd(categoryName, category => new RollingFileLogger(this, category));

    internal void Write(string category, LogLevel level, EventId eventId, string message, Exception? exception)
    {
        var now = DateTimeOffset.UtcNow;
        var filePath = Path.Combine(directory, $"app-{now:yyyyMMdd}.jsonl");
        var record = new
        {
            timestamp = now,
            level = level.ToString(),
            category,
            eventId = eventId.Id,
            message = Redact(message),
            exception = exception is null ? null : Redact(exception.ToString()),
        };

        var line = JsonSerializer.Serialize(record) + Environment.NewLine;
        lock (sync)
        {
            Directory.CreateDirectory(directory);
            if (File.Exists(filePath) && new FileInfo(filePath).Length + line.Length > maxFileBytes)
            {
                var rotated = Path.Combine(directory, $"app-{now:yyyyMMdd-HHmmssfff}.jsonl");
                File.Move(filePath, rotated, overwrite: false);
            }

            File.AppendAllText(filePath, line);
            PruneOldFiles();
        }
    }

    private void PruneOldFiles()
    {
        var files = new DirectoryInfo(directory)
            .GetFiles("app-*.jsonl")
            .OrderByDescending(file => file.LastWriteTimeUtc)
            .Skip(retainedFileCount)
            .ToList();
        foreach (var file in files) file.Delete();
    }

    private static string Redact(string value)
    {
        var redacted = BearerToken.Replace(value, "$1[REDACTED]");
        return SensitiveField.Replace(redacted, "$1$2[REDACTED]");
    }

    public void Dispose() => loggers.Clear();

    private sealed class RollingFileLogger(RollingFileLoggerProvider provider, string category) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;
        public bool IsEnabled(LogLevel logLevel) => logLevel != LogLevel.None;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel)) return;
            provider.Write(category, logLevel, eventId, formatter(state, exception), exception);
        }

        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();
            public void Dispose() { }
        }
    }
}

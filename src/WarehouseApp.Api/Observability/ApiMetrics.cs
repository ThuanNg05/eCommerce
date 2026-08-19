namespace WarehouseApp.Api.Observability;

public sealed class ApiMetrics
{
    private const int MaxSamples = 2000;
    private readonly object sync = new();
    private readonly Queue<double> durationSamples = new();
    private long requestCount;
    private long errorCount;

    public void Record(double durationMs, int statusCode)
    {
        lock (sync)
        {
            requestCount++;
            if (statusCode >= 500) errorCount++;
            durationSamples.Enqueue(durationMs);
            while (durationSamples.Count > MaxSamples) durationSamples.Dequeue();
        }
    }

    public ApiMetricsSnapshot Snapshot()
    {
        lock (sync)
        {
            var samples = durationSamples.OrderBy(value => value).ToArray();
            return new ApiMetricsSnapshot(
                requestCount,
                errorCount,
                samples.Length == 0 ? 0 : Percentile(samples, 0.50),
                samples.Length == 0 ? 0 : Percentile(samples, 0.95),
                samples.Length);
        }
    }

    private static double Percentile(double[] values, double percentile)
    {
        var index = (int)Math.Ceiling(values.Length * percentile) - 1;
        return Math.Round(values[Math.Clamp(index, 0, values.Length - 1)], 2);
    }
}

public sealed record ApiMetricsSnapshot(
    long RequestCount,
    long ErrorCount,
    double P50DurationMs,
    double P95DurationMs,
    int SampleCount);

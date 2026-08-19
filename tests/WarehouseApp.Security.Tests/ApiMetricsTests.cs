using WarehouseApp.Api.Observability;
using Xunit;

namespace WarehouseApp.Security.Tests;

public class ApiMetricsTests
{
    [Fact]
    public void SnapshotCountsErrorsAndCalculatesLatencyPercentiles()
    {
        var metrics = new ApiMetrics();
        metrics.Record(10, 200);
        metrics.Record(20, 500);
        metrics.Record(30, 200);

        var snapshot = metrics.Snapshot();

        Assert.Equal(3, snapshot.RequestCount);
        Assert.Equal(1, snapshot.ErrorCount);
        Assert.Equal(20, snapshot.P50DurationMs);
        Assert.Equal(30, snapshot.P95DurationMs);
        Assert.Equal(3, snapshot.SampleCount);
    }
}

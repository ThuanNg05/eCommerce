using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace WarehouseApp.Infrastructure.Data;

/// <summary>
/// Design-time factory used by <c>dotnet ef</c> (migrations / SQL scripting) so the
/// tooling never has to boot the WPF or API host. The connection string here is only
/// used when actually hitting a database (e.g. <c>database update</c>); generating a
/// migration or SQL script works fully offline. Override with the
/// <c>ConnectionStrings__Default</c> environment variable.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var cs = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
                 ?? "Host=localhost;Port=5432;Database=warehouse;Username=postgres;Password=postgres";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(cs)
            .UseSnakeCaseNamingConvention()
            .Options;

        return new AppDbContext(options);
    }
}

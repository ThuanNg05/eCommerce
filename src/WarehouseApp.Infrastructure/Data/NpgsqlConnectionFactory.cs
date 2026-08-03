using System.Data;
using Npgsql;

namespace WarehouseApp.Infrastructure.Data;

public sealed class NpgsqlConnectionFactory(string connectionString) : IDbConnectionFactory
{
    public IDbConnection Create() => new NpgsqlConnection(connectionString);
}

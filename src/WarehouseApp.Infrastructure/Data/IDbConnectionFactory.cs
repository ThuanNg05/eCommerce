using System.Data;

namespace WarehouseApp.Infrastructure.Data;

/// <summary>Creates raw ADO.NET connections for Dapper report hot-paths.</summary>
public interface IDbConnectionFactory
{
    IDbConnection Create();
}

using WarehouseApp.Core.Abstractions;
using WarehouseApp.Core.Dtos;

namespace WarehouseApp.Api.Endpoints;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/auth").WithTags("Auth");

        g.MapPost("/login", async (LoginRequest req, IAuthService svc, CancellationToken ct) =>
            await svc.LoginAsync(req, ct) is { } res
                ? Results.Ok(res)
                : Results.Problem(detail: "Invalid username or password.", statusCode: 401));

        return api;
    }
}

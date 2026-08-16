using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using WarehouseApp.Core;

namespace WarehouseApp.Api;

/// <summary>
/// Translates domain exceptions into RFC7807 ProblemDetails responses so both the
/// standalone dev API and the in-process desktop host report errors consistently.
/// </summary>
public sealed class DomainExceptionHandler(ILogger<DomainExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var (status, title) = ex switch
        {
            NotFoundException => (StatusCodes.Status404NotFound, ex.Message),
            DomainValidationException => (StatusCodes.Status400BadRequest, ex.Message),
            ConcurrencyConflictException => (StatusCodes.Status409Conflict, ex.Message),
            _ => (StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.")
        };

        if (status == StatusCodes.Status500InternalServerError)
        {
            logger.LogError(ex,
                "Unhandled API exception. CorrelationId: {CorrelationId}; Method: {Method}; Path: {Path}",
                ctx.TraceIdentifier,
                ctx.Request.Method,
                ctx.Request.Path);
        }

        ctx.Response.StatusCode = status;
        await ctx.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status,
            Title = title,
            Type = $"https://httpstatuses.io/{status}",
            Extensions = { ["correlationId"] = ctx.TraceIdentifier }
        }, ct);

        return true;
    }
}

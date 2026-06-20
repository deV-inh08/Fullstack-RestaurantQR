using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Text.Json;

namespace Shared.HealthChecks;

/// <summary>
/// JSON response writer dùng chung cho tất cả health check endpoints.
/// Format: { status, totalDuration, checks: [...] }
/// </summary>
public static class HealthResponseWriter
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public static async Task WriteAsync(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = report.Status == HealthStatus.Healthy ? 200 : 503;

        var result = new
        {
            status = report.Status.ToString(),
            totalDurationMs = Math.Round(report.TotalDuration.TotalMilliseconds, 2),
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                durationMs = Math.Round(e.Value.Duration.TotalMilliseconds, 2),
                description = e.Value.Description,
                error = e.Value.Exception?.Message
            })
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(result, JsonOptions));
    }
}
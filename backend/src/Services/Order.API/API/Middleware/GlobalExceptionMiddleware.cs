using System.Text.Json;

namespace Order.API.API.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message) = exception switch
        {
            UnauthorizedAccessException e => (401, e.Message),
            KeyNotFoundException e => (404, e.Message),
            ArgumentException e => (422, e.Message),
            _ => (500, "System Error")
        };

        if (statusCode >= 500)
            _logger.LogError(exception, "Unhandled exception: {Message}", exception.Message);

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var response = JsonSerializer.Serialize(new
        {
            message,
            statusCode
        }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        await context.Response.WriteAsync(response);
    }
}

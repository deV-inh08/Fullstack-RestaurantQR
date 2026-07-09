using System.Threading.RateLimiting;
using Azure.Monitor.OpenTelemetry.AspNetCore;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddOpenTelemetry()
.UseAzureMonitor();

// ─── YARP Reverse Proxy ───────────────────────────────────────────────────────
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// ─── CORS ─────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy
            .WithOrigins(
                builder.Configuration["AllowedOrigins:0"] ?? "http://localhost:4000",
                builder.Configuration["AllowedOrigins:1"] ?? "http://localhost:3000"
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(options =>
{
    // Global: 200 req/phút mỗi IP
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 200,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Policy "auth" — cho /auth/login endpoint (strict)
    options.AddPolicy("auth", ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    options.OnRejected = async (context, ct) =>
    {
        context.HttpContext.Response.StatusCode = 429;
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            """{"message":"Quá nhiều yêu cầu. Vui lòng thử lại sau.","statusCode":429}""",
            ct);
    };
});

// ─── Health checks ────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

var app = builder.Build();

app.UseCors("AllowFrontend");
app.UseRateLimiter();

// Health endpoint
app.MapHealthChecks("/health");

// YARP handles all routing
app.MapReverseProxy();

app.Run();
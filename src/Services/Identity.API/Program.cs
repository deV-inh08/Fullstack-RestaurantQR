using Azure.Monitor.OpenTelemetry.AspNetCore;
using Identity.API.API.Middleware;
using Identity.API.Application.Interfaces;
using Identity.API.Application.Services;
using Identity.API.Domain.Entities;
using Identity.API.Infrastructure.BackgroundJobs;
using Identity.API.Infrastructure.Persistence;
using Identity.API.Infrastructure.Utils;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.AspNetCore;
using Serilog.Events;
using Serilog.Formatting.Compact;
using Shared.HealthChecks;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;

// ─── Serilog bootstrap logger (catch startup errors) ──
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}")
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);


    builder.Services.AddOpenTelemetry()
    .UseAzureMonitor();

    // ─── Serilog ──────────────────────────────────────
    builder.Host.UseSerilog((ctx, services, config) =>
    {
        config
            .ReadFrom.Configuration(ctx.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext()
            .Enrich.WithProperty("Service", "Identity.API")
            .Enrich.WithProperty("Environment", ctx.HostingEnvironment.EnvironmentName);

        if (ctx.HostingEnvironment.IsProduction())
            config
            .WriteTo.Console(new RenderedCompactJsonFormatter()) // JSON cho ACA Log Analytics
            .WriteTo.ApplicationInsights(
                ctx.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"],
                TelemetryConverter.Traces);

        else
            config.WriteTo.Console(outputTemplate:
                "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}");
    });

    // ─── EF Core + SQL Server ─────────────────────────
    builder.Services.AddDbContext<IdentityDbContext>(options =>
        options.UseSqlServer(
            builder.Configuration.GetConnectionString("IdentityDb"),
            sql => sql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null)));

    // ─── JWT ──────────────────────────────────────────
    var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>()
        ?? throw new InvalidOperationException("Jwt section is required in appsettings.json");
    builder.Services.AddSingleton(jwtSettings);

    // ─── Authentication ───────────────────────────────
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(jwtSettings.AccessTokenSecret)),
                ValidateIssuer = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidateAudience = true,
                ValidAudience = jwtSettings.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };
            options.Events = new JwtBearerEvents
            {
                OnForbidden = async (context) =>
                {
                    context.Response.StatusCode = 403;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(JsonSerializer.Serialize(new
                    {
                        message = "Permission denied",
                        statusCode = 403
                    }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
                }
            };
        });

    builder.Services.AddAuthorization();

    // ─── Rate Limiting ────────────────────────────────
    builder.Services.AddRateLimiter(options =>
    {
        options.AddPolicy("login", httpContext =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                }));

        options.AddPolicy("api", httpContext =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 100,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0
                }));

        options.OnRejected = async (context, cancellationToken) =>
        {
            context.HttpContext.Response.StatusCode = 429;
            context.HttpContext.Response.ContentType = "application/json";
            var retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retry)
                ? (int)retry.TotalSeconds : 60;
            context.HttpContext.Response.Headers["Retry-After"] = retryAfter.ToString();
            await context.HttpContext.Response.WriteAsync(
                JsonSerializer.Serialize(new
                {
                    message = $"Quá nhiều yêu cầu. Vui lòng thử lại sau {retryAfter} giây.",
                    statusCode = 429,
                    retryAfter
                }, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }),
                cancellationToken);
        };
    });

    // ─── Health Checks ────────────────────────────────
    builder.Services.AddHealthChecks()
        .AddSqlServer(
            connectionString: builder.Configuration.GetConnectionString("IdentityDb")!,
            name: "sqlserver",
            failureStatus: HealthStatus.Unhealthy,
            tags: ["db", "sql"]);


    // ─── Services ─────────────────────────────────────
    builder.Services.AddSingleton<IJwtUtil, JwtUtil>();
    builder.Services.AddSingleton<IPasswordUtil, PasswordUtil>();
    builder.Services.AddScoped<AuthService>();
    builder.Services.AddScoped<AccountService>();
    builder.Services.AddHostedService<RefreshTokenCleanupJob>();

    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();

    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
    });

    builder.Services.AddOpenApi();

    var app = builder.Build();



    // ─── Migration + Seeding ──────────────────────────
    if (!app.Environment.IsEnvironment("Testing"))   // ← thêm dòng này
    {
        using (var scope = app.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
            dbContext.Database.Migrate();

            if (!await dbContext.Accounts.AnyAsync())
            {
                dbContext.Accounts.Add(new Account
                {
                    Name = "Super Admin",
                    Email = "superadmin1@restaurant.com",
                    Role = UserRole.SuperAdmin,
                    Password = BCrypt.Net.BCrypt.HashPassword("SuperAdmin1@123678"),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
                await dbContext.SaveChangesAsync();
            }
        }
    }                                                 // ← đóng if
    // ─── Pipeline ─────────────────────────────────────
    app.UseMiddleware<GlobalExceptionMiddleware>();

    // Request logging — log mỗi request (method, path, status, duration)
    app.UseSerilogRequestLogging(opts =>
    {
        opts.MessageTemplate =
            "{RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
        opts.GetLevel = (ctx, elapsed, ex) =>
            ex != null || ctx.Response.StatusCode >= 500
                ? LogEventLevel.Error
                : LogEventLevel.Information;
    });

    app.UseCors();
    app.UseRateLimiter();

    // ─── Health endpoints ──────────────────────────────
    // GET /health       → liveness  (Azure startup probe)
    // GET /health/ready → readiness (Azure readiness probe)
    app.MapHealthChecks("/health", new HealthCheckOptions
    {
        Predicate = _ => false, // skip DB check → chỉ check app alive
        ResponseWriter = HealthResponseWriter.WriteAsync
    });
    app.MapHealthChecks("/health/ready", new HealthCheckOptions
    {
        Predicate = _ => true,  // include all checks (DB etc.)
        ResponseWriter = HealthResponseWriter.WriteAsync
    });

    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "Identity API");
    });
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

    Log.Information("Identity.API started on {Urls}", string.Join(", ",
        app.Urls.DefaultIfEmpty("http://+:3001")));

    await app.RunAsync();
}
catch (Exception ex) when (ex is not HostAbortedException)
{

    Console.Error.WriteLine("=== STARTUP FAILED ===");
    Console.Error.WriteLine(ex.ToString());
    Log.Fatal(ex, "Identity.API terminated unexpectedly");
    return 1;
}
finally
{
    await Log.CloseAndFlushAsync();
}

return 0;

public partial class Program { }
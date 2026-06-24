using Azure.Monitor.OpenTelemetry.AspNetCore;
using Menu.API.API.Middleware;
using Menu.API.Application.Services;
using Menu.API.Infrastructure.Persistence;
using Menu.API.Infrastruture.Utils;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using Serilog.Events;
using Serilog.Formatting.Compact;
using Shared.HealthChecks;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    JwtSecurityTokenHandler.DefaultMapInboundClaims = false;

    var builder = WebApplication.CreateBuilder(args);


    builder.Services.AddOpenTelemetry()
    .UseAzureMonitor();

    builder.Host.UseSerilog((ctx, services, config) =>
    {
        config
            .ReadFrom.Configuration(ctx.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext()
            .Enrich.WithProperty("Service", "Menu.API")
            .Enrich.WithProperty("Environment", ctx.HostingEnvironment.EnvironmentName);

        if (ctx.HostingEnvironment.IsProduction())
            config
                .WriteTo.Console(new RenderedCompactJsonFormatter())
                .WriteTo.ApplicationInsights(
                ctx.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"],
                TelemetryConverter.Traces);
        else
            config.WriteTo.Console(outputTemplate:
                "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}");
    });

    builder.Services.AddDbContext<MenuDbContext>(options =>
        options.UseSqlServer(
            builder.Configuration.GetConnectionString("MenuDb"),
            sql => sql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null)));

    var jwtIssuer = builder.Configuration["Jwt:Issuer"];
    var jwtAudience = builder.Configuration["Jwt:Audience"];
    var jwtSecret = builder.Configuration["Jwt:AccessTokenSecret"];

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret!)),
                ValidateIssuer = true,
                ValidIssuer = jwtIssuer,
                ValidateAudience = true,
                ValidAudience = jwtAudience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
                RoleClaimType = "role",
                NameClaimType = "email"
            };
            options.Events = new JwtBearerEvents
            {
                OnChallenge = async context =>
                {
                    context.HandleResponse();
                    context.Response.StatusCode = 401;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(JsonSerializer.Serialize(
                        new { message = "Bạn chưa đăng nhập hoặc token không hợp lệ", statusCode = 401 },
                        new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
                },
                OnForbidden = async context =>
                {
                    context.Response.StatusCode = 403;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(JsonSerializer.Serialize(
                        new { message = "Bạn không có quyền thực hiện hành động này", statusCode = 403 },
                        new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
                }
            };
        });

    builder.Services.AddAuthorization();

    // ─── Health Checks ────────────────────────────────
    builder.Services.AddHealthChecks()
        .AddSqlServer(
            connectionString: builder.Configuration.GetConnectionString("MenuDb")!,
            name: "sqlserver",
            failureStatus: HealthStatus.Unhealthy,
            tags: ["db", "sql"]);

    builder.Services.AddScoped<IFileUploadUtil, FileUploadUtil>();
    builder.Services.AddScoped<MenuService>();

    builder.Services.AddControllers()
        .AddJsonOptions(options =>
            options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddOpenApi();

    builder.Services.AddCors(options =>
        options.AddDefaultPolicy(policy =>
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

    var app = builder.Build();

    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<MenuDbContext>();
        db.Database.Migrate();
        await DatabaseSeeder.SeedAsync(db);
    }

    app.UseMiddleware<GlobalExceptionMiddleware>();
    app.UseSerilogRequestLogging(opts =>
    {
        opts.MessageTemplate = "{RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
        opts.GetLevel = (ctx, _, ex) =>
            ex != null || ctx.Response.StatusCode >= 500 ? LogEventLevel.Error : LogEventLevel.Information;
    });

    app.UseStaticFiles();
    app.UseCors();

    // ─── Health endpoints ──────────────────────────────
    app.MapHealthChecks("/health", new HealthCheckOptions
    {
        Predicate = _ => false,
        ResponseWriter = HealthResponseWriter.WriteAsync
    });
    app.MapHealthChecks("/health/ready", new HealthCheckOptions
    {
        Predicate = _ => true,
        ResponseWriter = HealthResponseWriter.WriteAsync
    });

    app.MapOpenApi();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "Menu API"));
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

    await app.RunAsync();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Menu.API terminated unexpectedly");
    return 1;
}
finally
{
    await Log.CloseAndFlushAsync();
}

return 0;

public partial class Program { }   // ← thêm dòng này
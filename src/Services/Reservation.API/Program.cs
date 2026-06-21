using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using MongoDB.Driver.Core.Configuration;
using Reservation.API.API.Middleware;
using Reservation.API.Application.Services;
using Reservation.API.Infrastructure.Persistence;
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

    // Serilog configuration
    builder.Host.UseSerilog((ctx, services, config) =>
    {
        config
            .ReadFrom.Configuration(ctx.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext()
            .Enrich.WithProperty("Service", "Reservation.API")
            .Enrich.WithProperty("Environment", ctx.HostingEnvironment.EnvironmentName);

        if (ctx.HostingEnvironment.IsProduction())
            config.WriteTo.Console(new RenderedCompactJsonFormatter());
        else
            config.WriteTo.Console(outputTemplate:
                "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}");
    });

    // ─── MongoDB ──────────────────────────────────────
    var mongoSettings = builder.Configuration.GetSection("MongoDb").Get<MongoDbSettings>()
        ?? throw new InvalidOperationException("MongoDb section is required");
    builder.Services.AddSingleton(mongoSettings);
    builder.Services.AddSingleton<ReservationDbContext>();

    // ─── JWT ──────────────────────────────────────────
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
                        new { message = "You are not authenticated or your token is invalid", statusCode = 401 },
                        new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
                },
                OnForbidden = async context =>
                {
                    context.Response.StatusCode = 403;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(JsonSerializer.Serialize(
                        new { message = "Permission denied", statusCode = 403 },
                        new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
                }
            };
        });

    builder.Services.AddAuthorization();

    // ─── Health Checks ────────────────────────────────
    builder.Services.AddHealthChecks()
     .AddMongoDb(
         clientFactory: _ => new MongoClient(mongoSettings.ConnectionString),
         name: "mongodb",
         failureStatus: HealthStatus.Unhealthy,
         tags: ["db", "mongo"]);

    builder.Services.AddScoped<ReservationService>();

    builder.Services.AddControllers()
        .AddJsonOptions(o =>
            o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddOpenApi();

    builder.Services.AddCors(options =>
        options.AddDefaultPolicy(policy =>
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

    var app = builder.Build();

    // ─── MongoDB indexes ──────────────────────────────
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<ReservationDbContext>();
        var indexBuilder = Builders<Reservation.API.Domain.Entities.Reservation>.IndexKeys;

        await db.Reservations.Indexes.CreateOneAsync(
            new CreateIndexModel<Reservation.API.Domain.Entities.Reservation>(
                indexBuilder.Descending(r => r.ReservationDate)));
        await db.Reservations.Indexes.CreateOneAsync(
            new CreateIndexModel<Reservation.API.Domain.Entities.Reservation>(
                indexBuilder.Ascending(r => r.Status)));
        await db.Reservations.Indexes.CreateOneAsync(
            new CreateIndexModel<Reservation.API.Domain.Entities.Reservation>(
                indexBuilder.Ascending(r => r.GuestPhone)));
    }

    app.UseMiddleware<GlobalExceptionMiddleware>();
    app.UseSerilogRequestLogging(opts =>
    {
        opts.MessageTemplate = "{RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
        opts.GetLevel = (ctx, _, ex) =>
            ex != null || ctx.Response.StatusCode >= 500 ? LogEventLevel.Error : LogEventLevel.Information;
    });

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
    app.UseSwaggerUI(options =>
        options.SwaggerEndpoint("/openapi/v1.json", "Reservation API"));
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

    await app.RunAsync();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Reservation.API terminated unexpectedly");
    return 1;
}
finally
{
    await Log.CloseAndFlushAsync();
}

return 0;

public partial class Program { }   // ← thêm dòng này
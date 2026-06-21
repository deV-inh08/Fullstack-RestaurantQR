using Order.API.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Order.API.API.Middleware;
using Order.API.Application.Interfaces;
using Order.API.Application.Service;
using Order.API.Infrastructure.ExternalServices;
using Order.API.Infrastructure.Persistence;
using Order.API.Infrastructure.Utils;
using Serilog;
using Serilog.Events;
using Serilog.Formatting.Compact;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

// ─── Serilog bootstrap ────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate:
        "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}")
    .CreateBootstrapLogger();

try
{
    Microsoft.IdentityModel.Logging.IdentityModelEventSource.ShowPII = true;
    JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
    JwtSecurityTokenHandler.DefaultMapInboundClaims = false;

    var builder = WebApplication.CreateBuilder(args);

    // ─── Serilog ──────────────────────────────────────
    builder.Host.UseSerilog((ctx, services, config) =>
    {
        config
            .ReadFrom.Configuration(ctx.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext()
            .Enrich.WithProperty("Service", "Order.API")
            .Enrich.WithProperty("Environment", ctx.HostingEnvironment.EnvironmentName);

        if (ctx.HostingEnvironment.IsProduction())
            config.WriteTo.Console(new RenderedCompactJsonFormatter());
        else
            config.WriteTo.Console(outputTemplate:
                "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}");
    });

    // ─── EF Core ──────────────────────────────────────
    builder.Services.AddDbContext<OrderDbContext>(options =>
        options.UseSqlServer(builder.Configuration.GetConnectionString("OrderDb"),
            sql => sql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null)));

    // ─── Guest JWT ────────────────────────────────────
    var guestJwtSettings = builder.Configuration.GetSection("GuestJwt").Get<GuestJwtSettings>()
        ?? throw new InvalidOperationException("GuestJwt section is required");
    builder.Services.AddSingleton(guestJwtSettings);
    builder.Services.AddSingleton<IGuestJwtUtil, GuestJwtUtil>();

    // ─── JWT Auth (Staff + Guest multi-scheme) ────────
    var jwtIssuer = builder.Configuration["Jwt:Issuer"];
    var jwtAudience = builder.Configuration["Jwt:Audience"];
    var jwtSecret = builder.Configuration["Jwt:AccessTokenSecret"];

    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = "MultiJwt";
        options.DefaultChallengeScheme = "MultiJwt";
    })
    .AddPolicyScheme("MultiJwt", displayName: "Staff or Guest JWT", options =>
    {
        options.ForwardDefaultSelector = context =>
        {
            var authHeader = context.Request.Headers.Authorization.FirstOrDefault();

            if (string.IsNullOrEmpty(authHeader))
            {
                var qs = context.Request.Query["access_token"].FirstOrDefault();
                if (!string.IsNullOrEmpty(qs))
                    authHeader = $"Bearer {qs}";
            }

            if (authHeader?.StartsWith("Bearer ") == true)
            {
                var raw = authHeader["Bearer ".Length..].Trim();
                var handler = new JwtSecurityTokenHandler();
                if (handler.CanReadToken(raw))
                {
                    var jwt = handler.ReadJwtToken(raw);
                    if (jwt.Claims.FirstOrDefault(c => c.Type == "tokenType")?.Value == "GuestAccess")
                        return "GuestJwt";
                }
            }

            return "StaffJwt";
        };
    })
    .AddJwtBearer("StaffJwt", options =>
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
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"].FirstOrDefault();
                if (!string.IsNullOrEmpty(token) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    ctx.Token = token;
                return Task.CompletedTask;
            },
            OnChallenge = async ctx =>
            {
                ctx.HandleResponse();
                ctx.Response.StatusCode = 401;
                ctx.Response.ContentType = "application/json";
                await ctx.Response.WriteAsync(JsonSerializer.Serialize(
                    new { message = "You are not authenticated or your token is invalid", statusCode = 401 },
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
            },
            OnForbidden = async ctx =>
            {
                ctx.Response.StatusCode = 403;
                ctx.Response.ContentType = "application/json";
                await ctx.Response.WriteAsync(JsonSerializer.Serialize(
                    new { message = "You do not have permission to perform this action", statusCode = 403 },
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
            }
        };
    })
    .AddJwtBearer("GuestJwt", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(guestJwtSettings.AccessTokenSecret)),
            ValidateIssuer = true,
            ValidIssuer = guestJwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = guestJwtSettings.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            RoleClaimType = "role",
            NameClaimType = "guestId"
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"].FirstOrDefault();
                if (!string.IsNullOrEmpty(token) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    ctx.Token = token;
                return Task.CompletedTask;
            },
            OnChallenge = async ctx =>
            {
                ctx.HandleResponse();
                ctx.Response.StatusCode = 401;
                ctx.Response.ContentType = "application/json";
                await ctx.Response.WriteAsync(JsonSerializer.Serialize(
                    new { message = "Phiên hết hạn, vui lòng quét QR lại", statusCode = 401 },
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
            }
        };
    });

    builder.Services.AddAuthorization();

    // ─── Services ─────────────────────────────────────
    builder.Services.AddScoped<TableService>();
    builder.Services.AddScoped<GuestService>();
    builder.Services.AddScoped<OrderService>();
    builder.Services.AddScoped<BillService>();

    builder.Services.AddControllers()
        .AddJsonOptions(o =>
            o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddOpenApi();

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
        {
            var origins = builder.Configuration
                .GetSection("AllowedOrigins")
                .GetChildren()
                .Select(c => c.Value!)
                .Where(v => !string.IsNullOrEmpty(v))
                .ToArray();

            if (origins.Length == 0)
                origins = ["http://localhost:4000", "http://localhost:5000"];

            policy.WithOrigins(origins)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials(); // Bắt buộc cho SignalR
        });
    });

    builder.Services.AddSignalR(options =>
    {
        options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    });

    builder.Services.AddHttpClient<MenuApiClient>(client =>
    {
        client.BaseAddress = new Uri(builder.Configuration["MenuApi:BaseUrl"]
            ?? throw new InvalidOperationException("MenuApi:BaseUrl is not configured"));
    });

    var app = builder.Build();

    // ─── Migration + Seeding ──────────────────────────
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<OrderDbContext>();
        db.Database.Migrate();
        await DatabaseSeeder.SeedAsync(db);
    }

    // ─── Pipeline ─────────────────────────────────────
    app.UseMiddleware<GlobalExceptionMiddleware>();

    app.UseSerilogRequestLogging(opts =>
    {
        opts.MessageTemplate = "{RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
        opts.GetLevel = (ctx, _, ex) =>
            ex != null || ctx.Response.StatusCode >= 500 ? LogEventLevel.Error : LogEventLevel.Information;
    });

    app.UseCors("AllowFrontend");
    app.MapOpenApi();
    app.UseSwaggerUI(o => o.SwaggerEndpoint("/openapi/v1.json", "Order API"));
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();
    app.MapHub<OrderHub>("/hubs/order");

    Log.Information("Order.API started on {Urls}", string.Join(", ",
        app.Urls.DefaultIfEmpty("http://+:5219")));

    await app.RunAsync();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Console.Error.WriteLine("=== STARTUP FAILED ===");
    Console.Error.WriteLine(ex.ToString());
    Log.Fatal(ex, "Order.API terminated unexpectedly");
    return 1;
}
finally
{
    await Log.CloseAndFlushAsync();
}

return 0;

public partial class Program { }   // ← thêm dòng này
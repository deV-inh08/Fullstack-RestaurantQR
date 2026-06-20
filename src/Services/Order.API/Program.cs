using Order.API.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Order.API.API.Middleware;
using Order.API.Application.Interfaces;
using Order.API.Application.Service;
using Order.API.Infrastructure.ExternalServices;
using Order.API.Infrastructure.Persistence;
using Order.API.Infrastructure.Utils;
using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;


Microsoft.IdentityModel.Logging.IdentityModelEventSource.ShowPII = true;
Microsoft.IdentityModel.Logging.IdentityModelEventSource.LogCompleteSecurityArtifact = true;

var builder = WebApplication.CreateBuilder(args);

// ─── EF Core ──────────────────────────────────────────
builder.Services.AddDbContext<OrderDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("OrderDb"),
        sql => sql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null)));

// ─── Guest JWT ────────────────────────────────────────
var guestJwtSettings = builder.Configuration.GetSection("GuestJwt").Get<GuestJwtSettings>()
    ?? throw new InvalidOperationException("GuestJwt section is required");
builder.Services.AddSingleton(guestJwtSettings);
builder.Services.AddSingleton<IGuestJwtUtil, GuestJwtUtil>();

// ─── JWT (chỉ validate, không issue) ──────────────────

//Request đến Order.API
//        │
//        ▼
//   PolicyScheme "MultiJwt"
//   ReadJwtToken (parse only, không validate)
//   tokenType == "GuestAccess" ?
//        │                    │
//       Yes                   No
//        │                    │
//        ▼                    ▼
//  "GuestJwt"           "StaffJwt"
//  validate bằng        validate bằng
//  GuestJwt:            Jwt:
// GuestAccessTokenSecret         AccessTokenSecret
//        │                    │
//        ▼                    ▼
//  role = "Guest"       role = "Staff/Admin/SuperAdmin"
//  [Authorize(Roles = "Guest")] pass[Authorize(Roles = "Staff")] pass


JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
JwtSecurityTokenHandler.DefaultMapInboundClaims = false;

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
    // PolicyScheme là "router" — không validate, chỉ quyết định
    // forward sang scheme nào dựa vào nội dung token
    options.ForwardDefaultSelector = context =>
    {
        var authHeader = context.Request.Headers.Authorization
                                .FirstOrDefault();

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

            // ReadJwtToken chỉ parse, KHÔNG validate — an toàn ở đây
            // vì validate sẽ xảy ra ở scheme được forward đến
            if (handler.CanReadToken(raw))
            {
                var jwt = handler.ReadJwtToken(raw);
                var tokenType = jwt.Claims
                    .FirstOrDefault(c => c.Type == "tokenType")?.Value;

                if (tokenType == "GuestAccess")
                    return "GuestJwt";
            }
        }

        // Mặc định: Staff / Admin / SuperAdmin
        return "StaffJwt";
    };
})
.AddJwtBearer("StaffJwt", options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(
                                       Encoding.UTF8.GetBytes(jwtSecret!)),
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
        // Thêm event này để SignalR WebSocket hoạt động
        OnMessageReceived = ctx =>
        {
            var token = ctx.Request.Query["access_token"].FirstOrDefault();
            var path = ctx.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(token) && path.StartsWithSegments("/hubs"))
                ctx.Token = token;
            return Task.CompletedTask;
        },
        OnChallenge = async ctx =>
        {
            ctx.HandleResponse();
            ctx.Response.StatusCode = 401;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(
                new
                {
                    message = "You are not authenticated or your token is invalid",
                    statusCode = 401
                },
                new JsonSerializerOptions
                { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
        },
        OnForbidden = async ctx =>
        {
            ctx.Response.StatusCode = 403;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(
                new
                {
                    message = "You do not have permission to perform this action",
                    statusCode = 403
                },
                new JsonSerializerOptions
                { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
        }
    };
})
.AddJwtBearer("GuestJwt", options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(
                                       Encoding.UTF8.GetBytes(
                                           guestJwtSettings.AccessTokenSecret)),
        ValidateIssuer = true,
        ValidIssuer = guestJwtSettings.Issuer,
        ValidateAudience = true,
        ValidAudience = guestJwtSettings.Audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        RoleClaimType = "role",   // claim "role" = "Guest"
        NameClaimType = "guestId"
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var token = ctx.Request.Query["access_token"].FirstOrDefault();
            var path = ctx.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(token) && path.StartsWithSegments("/hubs"))
                ctx.Token = token;
            return Task.CompletedTask;
        },
        OnChallenge = async ctx =>
        {
            ctx.HandleResponse();
            ctx.Response.StatusCode = 401;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(
                new
                {
                    message = "Phiên hết hạn, vui lòng quét QR lại",
                    statusCode = 401
                },
                new JsonSerializerOptions
                { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
        }
    };
});

// Giữ nguyên — không thay đổi
builder.Services.AddAuthorization();

// ─── Services ─────────────────────────────────────────
builder.Services.AddScoped<TableService>();
builder.Services.AddScoped<GuestService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<BillService>();

builder.Services.AddControllers()
    .AddJsonOptions(o =>
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
//builder.Services.AddCors(options =>
//    options.AddDefaultPolicy(p =>
//        p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));


builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        // Đọc origins từ config thay vì hardcode
        // Trong docker-compose: AllowedOrigins__0, AllowedOrigins__1
        // Trong development: appsettings.Development.json
        var origins = builder.Configuration
            .GetSection("AllowedOrigins")
            .GetChildren()
            .Select(c => c.Value!)
            .Where(v => !string.IsNullOrEmpty(v))
            .ToArray();

        // Fallback nếu config trống
        if (origins.Length == 0)
        {
            origins = ["http://localhost:4000", "http://localhost:5000"];
        }

        policy
            .WithOrigins(origins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials(); // BẮT BUỘC cho SignalR WebSocket
    });
});

builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
});

builder.Services.AddHttpClient<MenuApiClient>(client =>
{
    // Đọc từ config, không hardcode
    client.BaseAddress = new Uri(builder.Configuration["MenuApi:BaseUrl"]
        ?? throw new InvalidOperationException("MenuApi:BaseUrl is not configured"));
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<OrderDbContext>();
    db.Database.Migrate();

    // Không seed dữ liệu mẫu vì Order.API không cần (không có bảng nào cần seed)
    await DatabaseSeeder.SeedAsync(db);
}

app.UseMiddleware<GlobalExceptionMiddleware>();
//app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.MapOpenApi();
app.UseSwaggerUI(o => o.SwaggerEndpoint("/openapi/v1.json", "Order API"));
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<OrderHub>("/hubs/order");

app.Run();
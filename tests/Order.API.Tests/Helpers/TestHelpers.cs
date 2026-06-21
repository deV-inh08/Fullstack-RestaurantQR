using Microsoft.AspNetCore.SignalR;
using Moq;
using Order.API.Hubs;
using Order.API.Infrastructure.ExternalServices;
using Order.API.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Text;
using System.Text.Json;

namespace Order.API.Tests.Helpers;

// â”€â”€ SignalR hub mock factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

public static class HubContextHelper
{
    /// <summary>
    /// Creates a fully wired Moq for IHubContext&lt;OrderHub&gt;.
    /// All SendCoreAsync calls are no-ops (returns Task.CompletedTask).
    /// </summary>
    public static Mock<IHubContext<OrderHub>> Create()
    {
        var hubMock     = new Mock<IHubContext<OrderHub>>();
        var clientsMock = new Mock<IHubClients>();
        var proxyMock   = new Mock<IClientProxy>();

        proxyMock
            .Setup(p => p.SendCoreAsync(
                It.IsAny<string>(),
                It.IsAny<object[]>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        clientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(proxyMock.Object);
        clientsMock.Setup(c => c.All).Returns(proxyMock.Object);

        hubMock.Setup(h => h.Clients).Returns(clientsMock.Object);

        return hubMock;
    }
}

// â”€â”€ Fake HttpMessageHandler for Menu API calls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

public class FakeHttpMessageHandler : HttpMessageHandler
{
    private readonly string _json;
    private readonly HttpStatusCode _statusCode;

    public FakeHttpMessageHandler(object responseObject,
        HttpStatusCode statusCode = HttpStatusCode.OK)
    {
        _json       = JsonSerializer.Serialize(responseObject);
        _statusCode = statusCode;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return Task.FromResult(new HttpResponseMessage(_statusCode)
        {
            Content = new StringContent(_json, Encoding.UTF8, "application/json")
        });
    }
}

// â”€â”€ EF Core OrderDbContext factory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

public static class OrderDbContextFactory
{
    public static OrderDbContext Create()
    {
        var opts = new DbContextOptionsBuilder<OrderDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new OrderDbContext(opts);
    }
}

// â”€â”€ MenuApiClient factory (uses FakeHttpMessageHandler) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

public static class MenuApiClientFactory
{
    /// <summary>
    /// Returns a MenuApiClient whose HTTP calls return the given snapshot data.
    /// </summary>
    public static MenuApiClient CreateWithSnapshot(int id, string name, decimal price,
        string? image = null)
    {
        var responseBody = new
        {
            message = "success",
            data    = new { id, name, price, imagePath = image }
        };
        var handler = new FakeHttpMessageHandler(responseBody);
        var http    = new HttpClient(handler)
        {
            BaseAddress = new Uri("http://menu-api-fake/")
        };
        return new MenuApiClient(http);
    }

    /// <summary>
    /// Returns a MenuApiClient that simulates Menu API being unavailable (404).
    /// </summary>
    public static MenuApiClient CreateNotFound()
    {
        var handler = new FakeHttpMessageHandler(new { }, HttpStatusCode.NotFound);
        var http    = new HttpClient(handler)
        {
            BaseAddress = new Uri("http://menu-api-fake/")
        };
        return new MenuApiClient(http);
    }
}

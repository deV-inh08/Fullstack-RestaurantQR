// Order.API/Infrastructure/ExternalServices/MenuApiClient.cs
namespace Order.API.Infrastructure.ExternalServices;

public record DishSnapshotResponse(
    int Id,
    string Name,
    decimal Price,
    string? ImagePath
);

public class MenuApiClient
{
    private readonly HttpClient _http;

    public MenuApiClient(HttpClient http) => _http = http;

    public async Task<DishSnapshotResponse> GetSnapshotAsync(int dishSnapshotId)
    {
        // GET http://menu-api/api/v1/dish-snapshot/{id}
        var response = await _http.GetAsync($"/api/v1/dish-snapshot/{dishSnapshotId}");

        if (!response.IsSuccessStatusCode)
            throw new KeyNotFoundException($"DishSnapshot {dishSnapshotId} not found in Menu.API");

        var body = await response.Content.ReadFromJsonAsync<MenuApiResponse<DishSnapshotResponse>>()
            ?? throw new InvalidOperationException("Invalid response from Menu.API");

        return body.Data;
    }
}

// Wrapper vì Menu.API trả { message, data }
internal record MenuApiResponse<T>(string Message, T Data);
// Shared pagination types — place in a shared DTOs file or per-service

namespace Shared.DTOs;

/// <summary>
/// Generic paginated response wrapper.
/// Usage: return Ok(new PaginatedResponse&lt;OrderDto&gt;(items, total, page, pageSize))
/// </summary>
public record PaginatedResponse<T>(
    IEnumerable<T> Data,
    int Total,
    int Page,
    int PageSize,
    string Message = "Success")
{
    public int TotalPages => (int)Math.Ceiling((double)Total / PageSize);
    public bool HasNext => Page < TotalPages;
    public bool HasPrev => Page > 1;
}

/// <summary>
/// Common pagination query params — bind with [FromQuery].
/// Usage: public async Task&lt;IActionResult&gt; GetAll([FromQuery] PaginationParams p)
/// </summary>
public record PaginationParams(
    int Page = 1,
    int PageSize = 20)
{
    public int Skip => (Page - 1) * PageSize;
    public int Take => Math.Clamp(PageSize, 1, 100); // max 100 per page
}
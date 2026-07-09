using Menu.API.Application.DTOs;
using Menu.API.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.DTOs;
namespace Menu.API.API.Controllers;

[ApiController]
[Route("api/v1/[controller]/dishes")]
public class MenuController : ControllerBase
{
    private readonly MenuService _menuService;

    public MenuController(MenuService menuService)
    {
        _menuService = menuService;
    }

    // ─── Public (Guest + Staff xem menu) ─────────────

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] PaginationParams p)
    {
        var result = await _menuService.GetAllAsync(p);
        return Ok(new { message = "Lấy danh sách món ăn thành công", data = result });
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _menuService.GetByIdAsync(id);
        return Ok(new { message = "Lấy món ăn thành công", data = result });
    }

    // ─── Admin/SuperAdmin ─────────────────────────────

    [HttpPost]
    [Consumes("multipart/form-data")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Create([FromForm] CreateDishRequest request)
    {
        var result = await _menuService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, new { message = "Tạo món ăn thành công", data = result });

    }


    [HttpPut("{id:int}")]
    [Consumes("multipart/form-data")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Update(int id, [FromForm] UpdateDishRequest request)
    {
        var result = await _menuService.UpdateAsync(id, request);
        return Ok(new { message = "Cập nhật món ăn thành công", data = result });
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateDishStatusRequest request)
    {
        var result = await _menuService.UpdateStatusAsync(id, request);
        return Ok(new { message = "Cập nhật trạng thái thành công", data = result });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _menuService.DeleteAsync(id);
        return Ok(new { message = "Xóa món ăn thành công", data = result });
    }
}


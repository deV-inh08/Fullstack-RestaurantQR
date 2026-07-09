using Identity.API.Application.DTOs;
using Identity.API.Domain.Entities;

namespace Identity.API.Application.Mappers;

public static class AccountMapper
{
    public static AccountDto ToDto(Account account) => new(
        account.Id,
        account.Name,
        account.Email,
        account.Role.ToString(),
        account.Avatar,
        account.CreatedAt,
        account.UpdatedAt);
}
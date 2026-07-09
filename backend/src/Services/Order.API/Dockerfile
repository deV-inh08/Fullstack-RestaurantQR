# src/Services/Order.API/Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 5219

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["src/Services/Order.API/Order.API.csproj", "src/Services/Order.API/"]
COPY ["BuildingBlocks/Shared.csproj", "BuildingBlocks/"]
RUN dotnet restore "src/Services/Order.API/Order.API.csproj"

COPY . .
WORKDIR "/src/src/Services/Order.API"
RUN dotnet build "Order.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Order.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Order.API.dll"]
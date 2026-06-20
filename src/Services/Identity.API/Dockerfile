# src/Services/Identity.API/Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 3001

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj files first (layer cache)
COPY ["src/Services/Identity.API/Identity.API.csproj", "src/Services/Identity.API/"]
COPY ["BuildingBlocks/Shared.csproj", "BuildingBlocks/"]
RUN dotnet restore "src/Services/Identity.API/Identity.API.csproj"

# Copy source
COPY . .
WORKDIR "/src/src/Services/Identity.API"
RUN dotnet build "Identity.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Identity.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Identity.API.dll"]
# src/Services/Menu.API/Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 3002

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["src/Services/Menu.API/Menu.API.csproj", "src/Services/Menu.API/"]
COPY ["BuildingBlocks/Shared.csproj", "BuildingBlocks/"]
RUN dotnet restore "src/Services/Menu.API/Menu.API.csproj"

COPY . .
WORKDIR "/src/src/Services/Menu.API"
RUN dotnet build "Menu.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Menu.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
# wwwroot cho image uploads
RUN mkdir -p /app/wwwroot/images
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Menu.API.dll"]
# src/Services/Reservation.API/Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 3004

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["src/Services/Reservation.API/Reservation.API.csproj", "src/Services/Reservation.API/"]
RUN dotnet restore "src/Services/Reservation.API/Reservation.API.csproj"

COPY . .
WORKDIR "/src/src/Services/Reservation.API"
RUN dotnet build "Reservation.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Reservation.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Reservation.API.dll"]
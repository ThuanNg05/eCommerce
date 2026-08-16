# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY global.json ./
COPY src/WarehouseApp.Core/WarehouseApp.Core.csproj src/WarehouseApp.Core/
COPY src/WarehouseApp.Infrastructure/WarehouseApp.Infrastructure.csproj src/WarehouseApp.Infrastructure/
COPY src/WarehouseApp.Api/WarehouseApp.Api.csproj src/WarehouseApp.Api/
RUN dotnet restore src/WarehouseApp.Api/WarehouseApp.Api.csproj

COPY src/ src/
RUN dotnet publish src/WarehouseApp.Api/WarehouseApp.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_EnableDiagnostics=0
COPY --from=build /app/publish .
EXPOSE 10000
ENTRYPOINT ["/bin/sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-10000} exec dotnet WarehouseApp.Api.dll"]

# syntax=docker/dockerfile:1
# AutoService.ApiService image (build context: repo root, see /.dockerignore).
# Build: docker build -f deploy/api.Dockerfile -t arsm-api .

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first, from the project files and lock files only, so the layer survives code edits.
COPY app/Directory.Build.props app/nuget.config app/
COPY app/AutoService.ServiceDefaults/AutoService.ServiceDefaults.csproj app/AutoService.ServiceDefaults/packages.lock.json app/AutoService.ServiceDefaults/
COPY app/AutoService.ApiService/AutoService.ApiService.csproj app/AutoService.ApiService/packages.lock.json app/AutoService.ApiService/
RUN dotnet restore app/AutoService.ApiService/AutoService.ApiService.csproj --locked-mode

COPY app/AutoService.ServiceDefaults/ app/AutoService.ServiceDefaults/
COPY app/AutoService.ApiService/ app/AutoService.ApiService/
RUN dotnet publish app/AutoService.ApiService/AutoService.ApiService.csproj -c Release --no-restore -o /out

# Debian-based runtime on purpose: QuestPDF's native renderer needs glibc (no Alpine), and ICU
# backs the pinned hu-HU culture of the PDF.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /out .
# PGGSSENCMODE: no Kerberos lib in this slim image, so Npgsql must not attempt GSS encryption (AppHost
# sets the same locally). EF Core logging drops to Warning: Information logs every SQL statement to paid ingestion.
ENV ASPNETCORE_HTTP_PORTS=8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    PGGSSENCMODE=disable \
    Logging__LogLevel__Microsoft.EntityFrameworkCore=Warning
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "AutoService.ApiService.dll"]

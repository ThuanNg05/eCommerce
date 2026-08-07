using System.Windows;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using WarehouseApp.Api;

namespace WarehouseApp.Desktop;

/// <summary>
/// Application entry point. Boots the ASP.NET Core API in-process (no external
/// server process) and then shows the WebView2 shell. The React app talks to this
/// host over HTTPS on <see cref="ApiBaseUrl"/>.
/// </summary>
public partial class App : Application
{
    /// <summary>
    /// Origin the in-process API listens on. Keep in sync with the React build's
    /// <c>VITE_API_BASE</c> (web/.env.production).
    /// </summary>
    public const string ApiBaseUrl = "https://localhost:5443";

    private WebApplication? _api;

    protected override async void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        try
        {
            _api = BuildInProcessApi();
            await _api.StartAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                $"Không thể khởi động API tích hợp.\n\n{ex.Message}\n\n" +
                "Set the ConnectionStrings__Default environment variable (see README) and restart.",
                "Warehouse App — startup", MessageBoxButton.OK, MessageBoxImage.Warning);
        }

        new MainWindow().Show();
    }

    private static WebApplication BuildInProcessApi()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls(ApiBaseUrl);

        ApiBootstrap.AddApiServices(builder.Services, builder.Configuration);

        var app = builder.Build();
        ApiBootstrap.UseApiPipeline(app);
        return app;
    }

    protected override async void OnExit(ExitEventArgs e)
    {
        if (_api is not null)
        {
            await _api.StopAsync();
            await _api.DisposeAsync();
        }

        base.OnExit(e);
    }
}

using System.Windows;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
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

        while (true)
        {
            var correlationId = Guid.NewGuid().ToString("N");
            WebApplication? candidate = null;

            try
            {
                candidate = BuildInProcessApi();

                await using (var scope = candidate.Services.CreateAsyncScope())
                {
                    var readiness = scope.ServiceProvider.GetRequiredService<DatabaseReadinessChecker>();
                    var result = await readiness.CheckAsync();
                    if (!result.IsReady)
                        throw new StartupReadinessException(result.Code);
                }

                await candidate.StartAsync();
                new MainWindow().Show();
                _api = candidate;
                return;
            }
            catch
            {
                _api = null;
                if (candidate is not null)
                    await candidate.DisposeAsync();

                var choice = MessageBox.Show(
                    "Không thể khởi động ứng dụng vì API hoặc cơ sở dữ liệu chưa sẵn sàng.\n\n" +
                    $"Mã hỗ trợ: {correlationId}\n\n" +
                    "Kiểm tra kết nối mạng và cấu hình ứng dụng. Chọn Có để thử lại, " +
                    "hoặc Không để thoát. " +
                    "Ứng dụng sẽ không mở màn hình nghiệp vụ khi kết nối chưa an toàn.",
                    "Warehouse App — startup",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Error);

                if (choice != MessageBoxResult.Yes)
                {
                    Shutdown(-1);
                    return;
                }
            }
        }
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

    private sealed class StartupReadinessException(string code)
        : Exception($"Startup readiness failed: {code}");
}

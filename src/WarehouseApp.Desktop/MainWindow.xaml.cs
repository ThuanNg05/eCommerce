using System.IO;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace WarehouseApp.Desktop;

/// <summary>
/// Hosts the React SPA in WebView2. The built bundle is served offline from a
/// virtual host (https://app.local/) mapped to the local <c>wwwroot</c> folder;
/// the SPA calls the in-process API at <see cref="App.ApiBaseUrl"/>.
/// </summary>
public partial class MainWindow : Window
{
    private const string VirtualHost = "app.local";

    public MainWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        await Web.EnsureCoreWebView2Async();
        var core = Web.CoreWebView2;

        var bundlePath = Path.Combine(AppContext.BaseDirectory, "wwwroot");
        if (Directory.Exists(bundlePath) && File.Exists(Path.Combine(bundlePath, "index.html")))
        {
            // https scheme keeps the SPA on a secure origin (required by several
            // browser APIs) and matches the CORS allow-list in ApiBootstrap.
            core.SetVirtualHostNameToFolderMapping(
                VirtualHost, bundlePath, CoreWebView2HostResourceAccessKind.Allow);
            Web.Source = new Uri($"https://{VirtualHost}/index.html");
        }
        else
        {
            core.NavigateToString(
                "<html><body style='font-family:sans-serif;padding:2rem'>" +
                "<h2>React bundle not found</h2>" +
                "<p>Build the front-end and rebuild the desktop app:</p>" +
                "<pre>cd web &amp;&amp; npm install &amp;&amp; npm run build</pre>" +
                "<p>The bundle is copied into <code>wwwroot</code> on the next build.</p>" +
                "</body></html>");
        }
    }
}

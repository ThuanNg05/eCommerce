using WarehouseApp.Api;

// Standalone development API host. In production the WPF shell hosts this same
// pipeline in-process (see WarehouseApp.Desktop/App.xaml.cs) via ApiBootstrap.
var builder = WebApplication.CreateBuilder(args);

ApiBootstrap.AddApiServices(builder.Services, builder.Configuration);

var app = builder.Build();

ApiBootstrap.UseApiPipeline(app);

app.Run();

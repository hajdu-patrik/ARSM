using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace AutoService.UnitTests.Configuration;

/** A host environment with a chosen name, for code that only asks IsDevelopment(). */
internal sealed class FakeHostEnvironment(string environmentName) : IWebHostEnvironment
{
    public string EnvironmentName { get; set; } = environmentName;

    public string ApplicationName { get; set; } = "AutoService.UnitTests";

    public string ContentRootPath { get; set; } = AppContext.BaseDirectory;

    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();

    public string WebRootPath { get; set; } = AppContext.BaseDirectory;

    public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();

    public static FakeHostEnvironment Development => new(Environments.Development);

    public static FakeHostEnvironment Production => new(Environments.Production);
}

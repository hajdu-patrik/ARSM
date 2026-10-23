using AutoService.ApiService.Configuration;

namespace AutoService.ApiService.CompanyProfiles;

/** Mirrors a saved company profile into the local development config files. */
public interface ICompanyProfileWriteBack
{
    Task WriteAsync(CompanyProfile profile, CancellationToken cancellationToken);
}

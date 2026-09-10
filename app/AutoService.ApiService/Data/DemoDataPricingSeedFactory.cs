using AutoService.ApiService.Domain;

namespace AutoService.ApiService.DataInitialization;

/**
 * Pure-data factory for demo parts and labor types. No database access —
 * mirrors DemoDataSeedFactory's role for the pricing catalog.
 */
internal static class DemoDataPricingSeedFactory
{
    private const int StandardVatRatePercent = 27;

    internal static List<Part> CreateParts() =>
    [
        new("OLF-1001", "Olajszűrő", 4500m, StandardVatRatePercent),
        new("LSZ-1002", "Levegőszűrő", 3200m, StandardVatRatePercent),
        new("FBP-2001", "Fékbetét szett, első", 18900m, StandardVatRatePercent),
        new("FBP-2002", "Fékbetét szett, hátső", 15900m, StandardVatRatePercent),
        new("AKK-3001", "Akkumulátor 60Ah", 62000m, StandardVatRatePercent),
        new("MOL-4001", "Motorolaj 5W-30, 5 liter", 14500m, StandardVatRatePercent),
        new("GYG-5001", "Gyújtógyertya", 2800m, StandardVatRatePercent)
    ];

    internal static List<LaborType> CreateLaborTypes() =>
    [
        new("OLAJCSERE", "Olajcsere", 8000m, StandardVatRatePercent),
        new("FEKJAVITAS", "Fékrendszer javítás", 12000m, StandardVatRatePercent),
        new("DIAGNOSZTIKA", "Motordiagnosztika", 9500m, StandardVatRatePercent),
        new("FUTOMUALL", "Futómű beállítás", 15000m, StandardVatRatePercent)
    ];
}

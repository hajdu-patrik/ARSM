namespace AutoService.ApiService.Domain.UniqueTypes;

/** Broad vehicle-technology group a mechanic specialises in; persisted as a string, explicit ints kept for backwards compatibility. */
public enum SpecializationType
{
    GasolineAndDiesel = 1, // Conventional internal combustion engine vehicles.
    HybridAndElectric = 2, // Hybrid and full battery-electric vehicles.
    All = 3,               // No restriction — can work on any vehicle technology.
}